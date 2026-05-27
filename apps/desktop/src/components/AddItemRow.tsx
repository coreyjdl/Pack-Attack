interface Props {
  value: string;
  setValue: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}

export function AddItemRow({ value, setValue, onAdd, placeholder }: Props): JSX.Element {
  return (
    <div className="add-row">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAdd();
        }}
      />
      <button type="button" onClick={onAdd}>
        Add
      </button>
    </div>
  );
}
