/**
 * Debug Log Panel - Shows pill tracing logs with copy functionality
 */

import { useState, useEffect } from 'react';
import { Copy, X, Minimize2, Maximize2 } from 'lucide-react';
import { getDebugLogs, clearDebugLogs, type PillTrace } from '../utils/debug';
import { useToast } from '@/hooks/use-toast';

export function DebugLogPanel() {
  const [logs, setLogs] = useState<PillTrace[]>([]);
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('debugLogPanel.isOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('debugLogPanel.isMinimized');
    return saved === 'true';
  });
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(getDebugLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('debugLogPanel.isOpen', String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('debugLogPanel.isMinimized', String(isMinimized));
  }, [isMinimized]);

  const copyAllLogs = () => {
    const formatted = logs.map(log => {
      const shortSig = log.mp?.signature?.slice(-20);
      return JSON.stringify({
        ...log,
        mp: { ...log.mp, signature: shortSig }
      }, null, 2);
    }).join('\n\n');

    navigator.clipboard.writeText(formatted);
    toast({
      title: "Logs Copied",
      description: `${logs.length} log entries copied to clipboard`,
    });
  };

  const copyLog = (log: PillTrace) => {
    const shortSig = log.mp?.signature?.slice(-20);
    const formatted = JSON.stringify({
      ...log,
      mp: { ...log.mp, signature: shortSig }
    }, null, 2);

    navigator.clipboard.writeText(formatted);
    toast({
      title: "Log Copied",
      description: "Single log entry copied to clipboard",
    });
  };

  const handleClear = () => {
    clearDebugLogs();
    setLogs([]);
    toast({
      title: "Logs Cleared",
      description: "All debug logs have been cleared",
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-2 hover:bg-accent transition-colors"
        title="Open Debug Logs"
      >
        <div className="text-xs font-semibold">Debug Logs ({logs.length})</div>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg"
      style={{ 
        width: isMinimized ? '300px' : '600px',
        maxHeight: isMinimized ? '60px' : '500px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground">Debug Logs</div>
          <div className="text-xs text-muted-foreground">
            {logs.length} entries
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-accent rounded transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-accent rounded transition-colors text-xs px-2"
            title="Clear logs"
          >
            Clear
          </button>
          <button
            onClick={copyAllLogs}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Copy all logs"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="overflow-auto p-3 space-y-2" style={{ maxHeight: '440px' }}>
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No logs yet. Logs will appear as the app runs.
            </div>
          ) : (
            logs.map((log, i) => (
              <div 
                key={i}
                className="text-xs font-mono bg-muted/30 p-2 rounded border border-border/50 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 overflow-auto">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${
                        log.stage === 'MP_BATCH' ? 'text-blue-500' :
                        log.stage === 'KEY_RESOLUTION' ? 'text-purple-500' :
                        log.stage === 'ENRICH_BLOCK' ? 'text-green-500' :
                        log.stage === 'SET_NODES' ? 'text-orange-500' :
                        log.stage === 'RF_RENDER' ? 'text-cyan-500' :
                        'text-pink-500'
                      }`}>
                        {log.stage}
                      </span>
                      {log.blockId && (
                        <span className="text-muted-foreground">{log.blockId}</span>
                      )}
                      {log.note && (
                        <span className={`text-xs ${
                          log.note === 'MISS' ? 'text-red-500 font-bold' :
                          log.note === 'hit' ? 'text-green-500' :
                          'text-muted-foreground'
                        }`}>
                          {log.note}
                        </span>
                      )}
                    </div>
                    {log.mp && (
                      <div className="text-muted-foreground ml-2">
                        count: {log.mp.count ?? 'undefined'} | 
                        len: {log.mp.optionsLen ?? 0} | 
                        show: {String(log.mp.show)} | 
                        sig: {log.mp.signature?.slice(-15) ?? 'none'}
                      </div>
                    )}
                    {log.pickedKey && (
                      <div className="text-muted-foreground ml-2">
                        picked: {log.pickedKey}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => copyLog(log)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
                    title="Copy this log"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
