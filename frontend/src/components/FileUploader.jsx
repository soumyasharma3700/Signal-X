import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { bytesSize } from '../utils/formatters.js';

const ROLES = {
  nav_pvt: 'Navigation',
  mon_rf: 'RF monitor',
  rinex: 'RINEX',
  scenario: 'Metadata',
};

function roleFor(name) {
  const n = name.toLowerCase();
  if (n.includes('nav_pvt')) return 'nav_pvt';
  if (n.includes('mon_rf')) return 'mon_rf';
  if (n.includes('rinex')) return 'rinex';
  if (n.includes('scenario') || n.endsWith('.json')) return 'scenario';
  return null;
}

export default function FileUploader({ files, onChange }) {
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((list) => {
    const incoming = Array.from(list).filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith('.csv') || n.endsWith('.json');
    });
    const merged = [...files];
    for (const f of incoming) {
      if (!merged.find((m) => m.name === f.name && m.size === f.size)) {
        merged.push(f);
      }
    }
    onChange(merged);
  }, [files, onChange]);

  const remove = (idx) => onChange(files.filter((_, i) => i !== idx));

  return (
    <div>
      <div
        className={`dropzone ${dragover ? 'dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={(e) => { e.preventDefault(); setDragover(false); addFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.json"
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="icon-wrap"><UploadCloud size={36} /></div>
        <h3>Drop GNSS recording files here</h3>
        <p>or click to browse — CSV and scenario JSON accepted</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          Include <code>nav_pvt.csv</code> at minimum. Related files should belong to the same recording.
        </p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => {
            const role = roleFor(f.name);
            return (
              <div key={`${f.name}-${f.size}`} className="file-item">
                <FileText size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span className="name">{f.name}</span>
                {role && <span className="role">{ROLES[role]}</span>}
                <span className="size">{bytesSize(f.size)}</span>
                <button className="icon-btn" onClick={() => remove(i)} aria-label="Remove">
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
