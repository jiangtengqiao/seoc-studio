// SEOC Studio 研智助手 - AI 聊天 Edge Function
// 支持流式 SSE、实时 token 监测、余额不足强制中断
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  callProviderStream,
  getProviderApiKey,
  calculateCost,
  estimateTokens,
  shouldResetFreeQuota,
  type ModelConfig,
  type ChatMessage,
  type StreamChunk,
} from '../_shared/ai-providers.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { model: modelId, messages } = await req.json();
    if (!modelId || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '参数不完整' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
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

    // 5. 预检：余额 + 免费额度均为 0 时拒绝
    const totalAvailable = balance + (freeRemaining > 0 ? 99999 : 0); // 有免费额度时不限制
    if (balance <= 0 && freeRemaining <= 0 && model.input_price + model.output_price > 0) {
      return new Response(
        JSON.stringify({ error: '研点不足', balance, free_remaining: freeRemaining }),
        { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 6. 获取厂商 API Key 并发起流式调用
    const providerApiKey = getProviderApiKey(model.provider);
    const stream = await callProviderStream(model, messages as ChatMessage[], providerApiKey);

    // 7. 流式 SSE 输出 + 实时监测
    const reader = stream.getReader();
    let accumulatedOutput = '';
    let estimatedOutputTokens = 0;
    let chunkCount = 0;
    let interrupted = false;
    let finalUsage = null;

    const encoder = new TextEncoder();

    const sseStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
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
                const inputEstimate = estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
                const currentCost = calculateCost(
                  inputEstimate,
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

                // 余额检查（仅对付费模型）
                if (model.input_price + model.output_price > 0) {
                  const availableForPaid = freeRemaining > 0
                    ? Infinity  // 有免费额度时不限制
                    : balance;
                  if (currentCost > availableForPaid) {
                    interrupted = true;
                    sendEvent({
                      type: 'interrupted',
                      reason: '研点不足',
                      tokens_used: estimatedOutputTokens,
                      cost: Math.round(currentCost * 10000) / 10000,
                      balance,
                      free_remaining: freeRemaining,
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

          // 8. 计费：使用精确 usage 或估算值
          const inputTokens = finalUsage?.input_tokens || estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
          const outputTokens = finalUsage?.output_tokens || estimatedOutputTokens;
          const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);

          let isFree = false;
          let deductedFromFree = 0;
          let deductedFromBalance = 0;

          if (freeRemaining > 0 && !interrupted) {
            // 走免费额度
            isFree = true;
            freeRemaining = Math.max(0, freeRemaining - 1);
            await adminClient
              .from('ai_credits')
              .update({ free_remaining: freeRemaining, updated_at: new Date().toISOString() })
              .eq('user_id', userId);
          } else if (cost > 0) {
            // 从余额扣费
            balance = Math.max(0, balance - cost);
            deductedFromBalance = cost;
            await adminClient
              .from('ai_credits')
              .update({ balance, updated_at: new Date().toISOString() })
              .eq('user_id', userId);
          }

          // 9. 记录使用日志
          await adminClient.from('ai_usage_logs').insert({
            user_id: userId,
            model_id: model.id,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost,
            is_free: isFree,
            interrupted,
          });

          // 10. 记录交易流水（非免费时）
          if (!isFree && cost > 0) {
            await adminClient.from('ai_transactions').insert({
              user_id: userId,
              amount: -cost,
              type: 'consumption',
              note: `使用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token`,
            });
          }

          // 11. 发送完成事件
          sendEvent({
            type: 'done',
            usage: { input_tokens: inputTokens, output_tokens: outputTokens },
            cost: Math.round(cost * 10000) / 10000,
            is_free: isFree,
            interrupted,
            balance,
            free_remaining: freeRemaining,
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          sendEvent({ type: 'error', message: String(err?.message || err) });
          controller.close();
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
