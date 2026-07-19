import { useState, useRef, useCallback } from 'react';
import { CaretLeft, Play, Copy, Check, Warning } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction';
import { Button } from '../../components/Button';

const DEFAULT_CONFIG = {
  component: {
    type: 'div',
    props: { className: 'flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8' },
    children: [
      {
        type: 'div',
        props: { className: 'bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center' },
        children: [
          {
            type: 'h1',
            props: { className: 'text-2xl font-bold text-gray-900 mb-4' },
            children: 'Hello, Playground!',
          },
          {
            type: 'p',
            props: { className: 'text-gray-600 mb-6' },
            children: 'Edit this JSON to see your component rendered in real-time.',
          },
          {
            type: 'button',
            props: {
              className: 'bg-[#0891B2] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#0E7490] transition-colors',
            },
            children: 'Get Started',
          },
        ],
      },
    ],
  },
};

type Tab = 'preview' | 'code' | 'html';

export default function PlaygroundPage() {
  const navigate = useNavigate();
  const [jsonInput, setJsonInput] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [result, setResult] = useState<{ js: string; css: string; html: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const handleJsonChange = useCallback((value: string) => {
    setJsonInput(value);
    setParseError(null);
    setServerError(null);
    try {
      JSON.parse(value);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, []);

  const handleRender = useCallback(async () => {
    setParseError(null);
    setServerError(null);

    let config;
    try {
      config = JSON.parse(jsonInput);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }

    setIsCompiling(true);
    try {
      const res = await api.post('/playground/render', { config });
      const data = res.data.data;
      setResult(data);
      setActiveTab('preview');

      if (previewRef.current) {
        const doc = previewRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(data.html);
          doc.close();
        }
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setServerError(axiosErr?.response?.data?.error || 'Compilation failed');
    } finally {
      setIsCompiling(false);
    }
  }, [jsonInput]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const text = activeTab === 'code'
      ? result.js
      : activeTab === 'html'
        ? result.html
        : result.css;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result, activeTab]);

  const tabButtonClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tab
        ? 'bg-[#0891B2] text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <ScreenWithBottomAction
      actions={
        <Button
          onClick={handleRender}
          disabled={isCompiling || !!parseError}
          loading={isCompiling}
          className="w-full"
        >
          <Play className="w-5 h-5 mr-2" weight="fill" />
          {isCompiling ? 'Compiling...' : 'Run'}
        </Button>
      }
    >
      <div className="px-4 pt-2">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <CaretLeft className="w-5 h-5" weight="bold" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Playground</h1>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Component Config (JSON)
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="w-full h-64 px-4 py-3 font-mono text-sm bg-gray-900 text-green-400 rounded-xl border border-gray-700 focus:border-[#0891B2] focus:outline-none resize-none"
            spellCheck={false}
          />
          {parseError && (
            <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
              <Warning className="w-4 h-4 shrink-0" weight="fill" />
              <span>{parseError}</span>
            </div>
          )}
          {serverError && (
            <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
              <Warning className="w-4 h-4 shrink-0" weight="fill" />
              <span>{serverError}</span>
            </div>
          )}
        </div>

        {result && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                <button className={tabButtonClass('preview')} onClick={() => setActiveTab('preview')}>
                  Preview
                </button>
                <button className={tabButtonClass('code')} onClick={() => setActiveTab('code')}>
                  JS
                </button>
                <button className={tabButtonClass('html')} onClick={() => setActiveTab('html')}>
                  HTML
                </button>
              </div>
              <button
                onClick={handleCopy}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {activeTab === 'preview' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ height: '400px' }}>
                <iframe
                  ref={previewRef}
                  title="Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              </div>
            )}

            {activeTab === 'code' && (
              <pre className="p-4 bg-gray-900 text-green-400 rounded-xl text-xs overflow-auto max-h-[400px] font-mono">
                {result.js}
              </pre>
            )}

            {activeTab === 'html' && (
              <pre className="p-4 bg-gray-900 text-green-400 rounded-xl text-xs overflow-auto max-h-[400px] font-mono">
                {result.html}
              </pre>
            )}
          </div>
        )}
      </div>
    </ScreenWithBottomAction>
  );
}
