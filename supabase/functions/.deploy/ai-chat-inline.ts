// SEOC Studio 研智助手 - AI 聊天 Edge Function
// 支持流式 SSE、实时 token 监测、余额不足强制中断
// v7 加固：
//  - 服务端输入长度/token 上限（防免费额度无限长输入刷成本）
//  - 原子扣费（spend_ai_credits / spend_ai_free_quota RPC，防并发透支）
//  - 客户端断开（停止生成）时中断上游并做部分结算
//  - 每用户每分钟请求限流
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 服务端护栏
const MAX_INPUT_CHARS = 20000; // 单条消息最大字符数
const MAX_INPUT_TOKENS = 16000; // 历史总输入 token 上限
const MAX_OUTPUT_TOKENS = 4096; // 单次回复输出上限（厂商 max_tokens）
const RATE_LIMIT_PER_MIN = 15; // 每用户每分钟最多请求数

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // 1. JWT 验证用户身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 验证 JWT
    const { data: userData, error: authError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: '身份验证失败' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // 2. 解析请求
    let parsed: { model?: string; messages?: ChatMessage[] };
    try {
      parsed = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: '请求体不是合法 JSON' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { model: modelId, messages } = parsed;
    if (!modelId || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '参数不完整' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 2.5 输入护栏：角色白名单 + 长度/token 上限
    for (const m of messages) {
      if (!['system', 'user', 'assistant'].includes(m.role)) {
        return new Response(JSON.stringify({ error: '消息角色不合法' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (typeof m.content !== 'string' || m.content.length > MAX_INPUT_CHARS) {
        return new Response(
          JSON.stringify({ error: `单条消息不能超过 ${MAX_INPUT_CHARS} 字符` }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }
    const totalInputTokens = estimateTokens(messages.map((m) => m.content).join(''));
    if (totalInputTokens > MAX_INPUT_TOKENS) {
      return new Response(
        JSON.stringify({ error: `输入过长（约 ${totalInputTokens} token，上限 ${MAX_INPUT_TOKENS}）` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 2.6 速率限制：按最近 1 分钟 usage_logs 计数
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount } = await adminClient
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneMinAgo);
    if ((recentCount || 0) >= RATE_LIMIT_PER_MIN) {
      return new Response(
        JSON.stringify({ error: '请求过于频繁，请稍后再试', code: 'rate_limited' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 3. 查询模型配置
    const { data: modelData, error: modelError } = await adminClient
      .from('ai_models')
      .select('*')
      .eq('id', modelId)
      .eq('enabled', true)
      .maybeSingle();

    if (modelError || !modelData) {
      return new Response(JSON.stringify({ error: '模型不存在或已禁用' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const model = modelData as unknown as ModelConfig;

    // 3.5 会员等级校验（服务端强制）
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('membership_tier, membership_expires_at, is_banned')
      .eq('id', userId)
      .maybeSingle();
    const userTier = (profileData?.membership_tier as string) || 'free';
    const membershipExpiresAt = (profileData?.membership_expires_at as string) || null;

    // 3.6 封禁校验
    if (profileData?.is_banned) {
      return new Response(
        JSON.stringify({ error: '账户已被封禁，如有疑问请联系管理员', code: 'banned' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 3.7 内容审核：命中敏感词直接拒绝
    const { data: filterRows } = await adminClient
      .from('ai_content_filters')
      .select('pattern')
      .eq('enabled', true);
    const bannedPatterns = ((filterRows || []) as { pattern: string }[])
      .map((r) => r.pattern.toLowerCase())
      .filter((p) => p.length > 0);
    if (bannedPatterns.length > 0) {
      const userInput = messages
        .filter((m: ChatMessage) => m.role === 'user')
        .map((m: ChatMessage) => m.content)
        .join('\n')
        .toLowerCase();
      if (bannedPatterns.some((p) => userInput.includes(p))) {
        return new Response(
          JSON.stringify({ error: '输入包含违规内容，请修改后重试', code: 'content_filter' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }

    const tierCheck = canUseModelWithTier(userTier, membershipExpiresAt, model.min_tier || 'lite');
    if (!tierCheck.ok) {
      return new Response(
        JSON.stringify({ error: tierCheck.reason, code: 'membership_required' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 4. 查询用户余额与免费额度
    let { data: creditsData } = await adminClient
      .from('ai_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 如果不存在则创建
    if (!creditsData) {
      const { data: newCredits } = await adminClient
        .from('ai_credits')
        .insert({ user_id: userId, balance: 0, free_remaining: 0, free_reset_date: new Date().toISOString().slice(0, 10) })
        .select()
        .single();
      creditsData = newCredits;
    }

    let balance = Number(creditsData?.balance || 0);
    let freeRemaining = creditsData?.free_remaining || 0;
    const freeResetDate = creditsData?.free_reset_date || new Date().toISOString().slice(0, 10);

    // 免费额度重置
    if (shouldResetFreeQuota(freeResetDate)) {
      freeRemaining = model.free_daily_quota;
      await adminClient
        .from('ai_credits')
        .update({
          free_remaining: freeRemaining,
          free_reset_date: new Date().toISOString().slice(0, 10),
        })
        .eq('user_id', userId);
    }

    // 5. 预检：余额 + 免费额度均为 0 时拒绝（此时免费额度已重置为今日额度）
    if (balance <= 0 && freeRemaining <= 0 && model.input_price + model.output_price > 0) {
      return new Response(
        JSON.stringify({
          error: '研点不足：今日免费额度已用完，请充值研点或明天再试',
          code: 'insufficient_balance',
          balance,
          free_remaining: freeRemaining,
        }),
        { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 6. 获取厂商 API Key 并发起流式调用
    const providerApiKey = getProviderApiKey(model.provider);
    const stream = await callProviderStream(model, messages as ChatMessage[], providerApiKey, {
      maxTokens: MAX_OUTPUT_TOKENS,
    });

    // 7. 流式 SSE 输出 + 实时监测
    const reader = stream.getReader();
    let accumulatedOutput = '';
    let estimatedOutputTokens = 0;
    let chunkCount = 0;
    let interrupted = false;
    let finalUsage: TokenUsage | null = null;
    let settled = false; // 防止重复结算

    const encoder = new TextEncoder();

    // 结算：扣费 + 记录日志/流水。safeEnqueue 保证客户端断开后也不会抛错。
    const settle = async (): Promise<{ cost: number; isFree: boolean; balance: number; freeRemaining: number } | null> => {
      if (settled) return null;
      settled = true;

      const inputTokens = finalUsage?.input_tokens || totalInputTokens;
      const outputTokens = finalUsage?.output_tokens || estimatedOutputTokens;
      const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);

      let isFree = false;

      if (freeRemaining > 0 && !interrupted) {
        // 走免费额度（原子扣减一次）
        const { data: newFree } = await adminClient.rpc('spend_ai_free_quota', { p_user: userId });
        if (typeof newFree === 'number' && newFree >= 0) {
          isFree = true;
          freeRemaining = newFree;
        } else {
          // 免费额度竞争失败：转为余额扣费
          const { data: newBalance } = await adminClient.rpc('spend_ai_credits', {
            p_user: userId,
            p_cost: cost,
          });
          if (typeof newBalance === 'number' && newBalance >= 0) balance = newBalance;
          else balance = Math.max(0, balance - cost);
        }
      } else if (cost > 0) {
        // 从余额原子扣费
        const { data: newBalance } = await adminClient.rpc('spend_ai_credits', {
          p_user: userId,
          p_cost: cost,
        });
        if (typeof newBalance === 'number' && newBalance >= 0) balance = newBalance;
        else balance = Math.max(0, balance - cost);
      }

      // 记录使用日志
      try {
        await adminClient.from('ai_usage_logs').insert({
          user_id: userId,
          model_id: model.id,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost,
          is_free: isFree,
          interrupted,
        });
      } catch (_) {
        // 日志失败不阻断响应
      }

      // 记录交易流水（非免费时）
      if (!isFree && cost > 0) {
        try {
          await adminClient.from('ai_transactions').insert({
            user_id: userId,
            amount: -cost,
            type: 'consumption',
            note: `使用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token${interrupted ? '（中断）' : ''}`,
          });
        } catch (_) {
          // 流水失败不阻断响应
        }
      }

      return { cost, isFree, balance, freeRemaining };
    };

    const sseStream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const sendEvent = (data: object) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            closed = true;
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = value as StreamChunk;
            chunkCount++;

            if (chunk.delta) {
              accumulatedOutput += chunk.delta;

              // 估算 token（每 10 个 chunk 或每积累约 500 字符时重新估算）
              if (chunkCount % 10 === 0 || accumulatedOutput.length % 500 < chunk.delta.length) {
                estimatedOutputTokens = estimateTokens(accumulatedOutput);
                const currentCost = calculateCost(
                  totalInputTokens,
                  estimatedOutputTokens,
                  model.input_price,
                  model.output_price
                );

                // 实时消耗通知
                sendEvent({
                  type: 'progress',
                  delta: chunk.delta,
                  estimated_cost: Math.round(currentCost * 10000) / 10000,
                  estimated_tokens: estimatedOutputTokens,
                });

                // 余额检查（仅对付费模型，且有余额上限时）
                if (model.input_price + model.output_price > 0 && balance > 0 && freeRemaining <= 0) {
                  if (currentCost > balance) {
                    interrupted = true;
                    // 先结算（部分输出按实际消耗扣费）
                    const settledInfo = await settle();
                    sendEvent({
                      type: 'interrupted',
                      reason: '研点不足',
                      tokens_used: estimatedOutputTokens,
                      cost: Math.round(currentCost * 10000) / 10000,
                      balance: settledInfo?.balance ?? 0,
                      free_remaining: settledInfo?.freeRemaining ?? 0,
                    });
                    break;
                  }
                }
              } else {
                // 正常文本 chunk
                sendEvent({ type: 'chunk', delta: chunk.delta });
              }
            }

            // 厂商返回精确 usage（通常在最后一个 chunk）
            if (chunk.usage) {
              finalUsage = chunk.usage;
            }

            if (chunk.finish_reason) {
              break;
            }
          }

          // 8. 正常完成：结算并发送 done 事件
          //    中断路径已在上面结算并发送 interrupted 事件，这里不再重复。
          if (!settled) {
            const settledInfo = await settle();
            sendEvent({
              type: 'done',
              usage: {
                input_tokens: finalUsage?.input_tokens || totalInputTokens,
                output_tokens: finalUsage?.output_tokens || estimatedOutputTokens,
              },
              cost: Math.round((settledInfo?.cost ?? 0) * 10000) / 10000,
              is_free: settledInfo?.isFree ?? false,
              interrupted,
              balance: settledInfo?.balance ?? balance,
              free_remaining: settledInfo?.freeRemaining ?? freeRemaining,
            });
          }

          sendEvent({ type: 'eof' });
          if (!closed) {
            try {
              controller.close();
            } catch {
              /* 已关闭 */
            }
          }
        } catch (err) {
          // 上游异常或客户端取消：有部分输出则做部分结算
          if (accumulatedOutput) {
            interrupted = true;
            try {
              await settle();
            } catch {
              /* 结算失败不阻断 */
            }
          }
          sendEvent({ type: 'error', message: String(err?.message || err) });
          if (!closed) {
            try {
              controller.close();
            } catch {
              /* 已关闭 */
            }
          }
        }
      },
      // 客户端断开（停止生成）：中断上游读取
      async cancel() {
        try {
          await reader.cancel();
        } catch {
          /* 忽略 */
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
