import type { Agent } from '../../types';

// ---- Org Chart Node (recursive) ---- แยกจาก AICompany.tsx เพื่อลดขนาดไฟล์
interface OcNodeProps {
  agent: Agent;
  agents: Agent[];
  onAdd: (parentId: string) => void;
  onFire: (id: string) => void;
  onSaveField: (id: string, field: keyof Agent, value: string) => void;
  onGenJD: (id: string) => void;
  generatingJD: string | null;
}

export default function OcNode({ agent, agents, onAdd, onFire, onSaveField, onGenJD, generatingJD }: OcNodeProps) {
  const children = agents.filter(a => a.reportsTo === agent.id);
  const isGenJD = generatingJD === agent.id;
  return (
    <div className="oc-subtree">
      <div className="oc-node" style={{ borderTopColor: agent.color }}>
        <div className="oc-node-av" style={{ background: agent.color + '22' }}>{agent.avatar}</div>
        <div className="oc-node-info">
          <input className="oc-role-inp"
            defaultValue={agent.role} key={'ocr' + agent.id + agent.role}
            onBlur={e => onSaveField(agent.id, 'role', e.target.value)} spellCheck={false} />
          <input className="oc-name-inp"
            defaultValue={agent.name} key={'ocn' + agent.id + agent.name}
            onBlur={e => onSaveField(agent.id, 'name', e.target.value)} spellCheck={false} />
        </div>
        <div className="oc-node-actions">
          <button className="oc-jd-btn" onClick={() => onGenJD(agent.id)} disabled={isGenJD} title="สร้าง Job Description">
            {isGenJD ? '⏳' : '📄'}
          </button>
          <button className="oc-add-btn" onClick={() => onAdd(agent.id)} title="เพิ่มตำแหน่งใต้บังคับบัญชา">＋</button>
          <button className="oc-del-btn" onClick={() => onFire(agent.id)} title="ลบตำแหน่ง">×</button>
        </div>
        {agent.jd && (
          <details className="oc-jd-detail">
            <summary className="oc-jd-summary">📄 Job Description</summary>
            <pre className="oc-jd-body">{agent.jd}</pre>
          </details>
        )}
      </div>
      {children.length > 0 && (
        <div className="oc-children">
          {children.map(child => (
            <OcNode key={child.id} agent={child} agents={agents}
              onAdd={onAdd} onFire={onFire} onSaveField={onSaveField}
              onGenJD={onGenJD} generatingJD={generatingJD} />
          ))}
        </div>
      )}
    </div>
  );
}
