import { autoH } from '../utils';

interface Props {
  items: string[];
  itemKey: string;
  onSave: (idx: number, value: string) => void;
  onAdd: () => void;
  onDelete: (idx: number) => void;
  multiline?: boolean;
  bordered?: boolean;
  addLabel?: string;
  addStyle?: React.CSSProperties;
}

export default function EditableList({ items, itemKey, onSave, onAdd, onDelete, multiline = true, bordered = false, addLabel = '＋ เพิ่มรายการ', addStyle }: Props) {
  return (
    <>
      {items.map((item, idx) => (
        <div key={idx} className={`elist-row${bordered ? ' elist-bordered' : ''}`}>
          <span className="elist-bullet">›</span>
          {multiline ? (
            <textarea
              className="elist-inp"
              rows={1}
              defaultValue={item}
              key={`${itemKey}-${idx}`}
              onBlur={e => onSave(idx, e.target.value)}
              onChange={e => autoH(e.target)}
              ref={el => { if (el) autoH(el); }}
              spellCheck={false}
            />
          ) : (
            <input
              className="elist-inp"
              defaultValue={item}
              key={`${itemKey}-${idx}`}
              onBlur={e => onSave(idx, e.target.value)}
              spellCheck={false}
            />
          )}
          <button className="elist-del" onClick={() => onDelete(idx)}>×</button>
        </div>
      ))}
      <button className="add-row" style={addStyle} onClick={onAdd}>{addLabel}</button>
    </>
  );
}
