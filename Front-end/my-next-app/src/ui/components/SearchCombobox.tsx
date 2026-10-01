import { useState } from "react";

interface Option {
  id: string;
  label: string;
}
interface Props {
  id: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onSelect: (id: string, label: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Lista no fluxo da página, com foco mantido no campo de busca. */
export default function SearchCombobox({
  id,
  value,
  options,
  onChange,
  onSelect,
  error,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const select = (index: number) => {
    const option = options[index];
    if (!option) return;
    onSelect(option.id, option.label);
    setOpen(false);
    setActive(-1);
  };
  const move = (index: number) => {
    setActive(index);
    requestAnimationFrame(() =>
      document
        .getElementById(`${id}-option-${index}`)
        ?.scrollIntoView({ block: "nearest" }),
    );
  };
  return (
    <>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-lista`}
        aria-activedescendant={
          open && active >= 0 && active < options.length
            ? `${id}-option-${active}`
            : undefined
        }
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={`form-control input-form${error ? " is-invalid" : ""}`}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            if (options.length)
              move(
                e.key === "ArrowDown"
                  ? (active + 1) % options.length
                  : active <= 0
                    ? options.length - 1
                    : active - 1,
              );
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            select(active);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setActive(-1);
          }
        }}
      />
      {error && (
        <div id={`${id}-erro`} className="invalid-feedback d-block">
          {error}
        </div>
      )}
      <ul
        id={`${id}-lista`}
        role="listbox"
        hidden={!open}
        aria-label="Resultados da busca"
        className="list-group w-100 mt-1"
        style={{ maxHeight: 180, overflowY: "auto" }}
      >
        {options.map((option, index) => (
          <li
            id={`${id}-option-${index}`}
            key={option.id}
            role="option"
            aria-selected={index === active}
            className={`list-group-item ${index === active ? "active" : "bg-dark text-white"}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(index)}
          >
            {option.label}
          </li>
        ))}
      </ul>
      {open && options.length === 0 && (
        <p role="status">Nenhum resultado encontrado.</p>
      )}
    </>
  );
}
