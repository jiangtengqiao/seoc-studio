import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { Reveal, BackButton } from '../components/fx';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  getModels,
  TIER_INFO,
  type AIApiKey,
  type AIModel,
} from '../lib/ai';

export default function AIApiKeys() {
  const { t, lang } = useI18n();
  const [keys, setKeys] = useState<AIApiKey[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [k, m] = await Promise.all([listApiKeys(), getModels()]);
    setKeys(k);
    setModels(m);
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const key = await createApiKey(newKeyName.trim());
      setNewKey(key);
      setNewKeyName('');
      await loadData();
    } catch (e) {
      alert(`创建失败: ${e}`);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm(t('ai.api.revokeConfirm'))) return;
    try {
      await revokeApiKey(id);
      await loadData();
    } catch (e) {
      alert(`撤销失败: ${e}`);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://hjmgwlxohxinqhwxdspf.supabase.co'}/functions/v1/ai-api-proxy`;

  return (
    <div className="container-x py-8">
      <Reveal>
        <div className="mb-8 flex items-center gap-3">
          <BackButton to="/ai" />
          <div>
            <h1 className="text-2xl font-bold text-brand-950">{t('ai.api.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('ai.api.subtitle')}</p>
          </div>
        </div>
      </Reveal>

      {/* 创建密钥 */}
      <Reveal>
        <div className="card mb-6 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">{t('ai.api.createKey')}</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={t('ai.api.keyNamePlaceholder')}
              className="input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button onClick={handleCreate} disabled={!newKeyName.trim()} className="btn-primary shrink-0">
              {t('ai.api.create')}
            </button>
          </div>

          {newKey && (
            <div className="mt-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-medium text-amber-800">
                {t('ai.api.keyCreatedWarning')}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm text-slate-800 break-all">
                  {newKey}
                </code>
                <button
                  onClick={() => handleCopy(newKey)}
                  className="btn-outline shrink-0 text-sm"
                >
                  {copied ? t('ai.api.copied') : t('ai.api.copy')}
                </button>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* 密钥列表 */}
      <Reveal>
        <div className="card mb-8 overflow-hidden">
          <div className="panel-strip" />
          <h3 className="px-6 pt-5 text-lg font-semibold text-slate-800">{t('ai.api.myKeys')}</h3>
          {keys.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">{t('ai.api.noKeys')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.api.keyName')}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.api.keyPreview')}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.api.lastUsed')}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.api.createdAt')}</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{key.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        sk-seoc-****{key.key_hash.slice(-8)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {key.last_used_at ? new Date(key.last_used_at).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(key.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="text-sm text-red-600 hover:text-red-800 hover:underline"
                        >
                          {t('ai.api.revoke')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      {/* API 文档 */}
      <Reveal>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-800">{t('ai.api.docs')}</h3>
            <button
              onClick={() => setShowDocs(!showDocs)}
              className="btn-ghost text-sm"
            >
              {showDocs ? t('ai.api.hideDocs') : t('ai.api.showDocs')}
            </button>
          </div>

          {showDocs && (
            <div className="border-t border-slate-100 px-6 py-5 prose-seoc">
              <h4>{t('ai.api.endpoint')}</h4>
              <div className="mb-4 rounded-lg bg-brand-950 px-4 py-3">
                <code className="text-sm text-slate-100">{endpointUrl}/v1/chat/completions</code>
              </div>

              <h4>{t('ai.api.auth')}</h4>
              <p className="mb-4">
                {t('ai.api.authDesc')}
              </p>
              <div className="mb-4 rounded-lg bg-brand-950 px-4 py-3">
                <code className="text-sm text-slate-100">Authorization: Bearer sk-seoc-your-api-key</code>
              </div>

              <h4>{t('ai.api.example')}</h4>

              <h5>Python</h5>
              <pre><code>{`from openai import OpenAI

client = OpenAI(
    api_key="sk-seoc-your-api-key",
    base_url="${endpointUrl}/v1"
)

response = client.chat.completions.create(
    model="${models[0]?.id || 'qwen-max'}",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)`}</code></pre>

              <h5>cURL</h5>
              <pre><code>{`curl ${endpointUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-seoc-your-api-key" \\
  -d '{
    "model": "${models[0]?.id || 'qwen-max'}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</code></pre>

              <h4>{t('ai.api.availableModels')}</h4>
              <p className="mb-3 text-sm text-slate-500">
                价格单位为<strong>研点/千 token</strong>（1 元 = 1000 研点）。例如输入价 4 研点/千token ≈ ¥4/百万输入token。
                会员门槛指使用该模型所需的最低会员等级。
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Model ID</th>
                    <th>名称</th>
                    <th>{t('ai.credits.provider')}</th>
                    <th>输入 (研点/1K)</th>
                    <th>输出 (研点/1K)</th>
                    <th>≈ 元/百万token</th>
                    <th>会员门槛</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id}>
                      <td><code>{m.id}</code></td>
                      <td>{m.display_name[lang] || m.display_name['zh-CN'] || m.id}</td>
                      <td>{m.provider}</td>
                      <td>{m.input_price}</td>
                      <td>{m.output_price}</td>
                      <td className="text-slate-500">¥{m.input_price}/¥{m.output_price}</td>
                      <td>
                        <span className="badge bg-slate-100 text-slate-600">{TIER_INFO[m.min_tier]?.name || m.min_tier}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>{t('ai.api.compatibility')}</h4>
              <ul>
                <li>{t('ai.api.compat1')}</li>
                <li>{t('ai.api.compat2')}</li>
                <li>{t('ai.api.compat3')}</li>
              </ul>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
