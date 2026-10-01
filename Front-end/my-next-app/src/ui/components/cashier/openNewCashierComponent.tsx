import SearchCombobox from "../SearchCombobox";
import { focusFirstError } from "../../../utils/validationUtils";
import React, { useMemo, useState } from "react";
import styles from "../../styles/cashierPage.module.css";
import axios from "axios";

export interface CreateCashierPayload {
  responsibleId: string;
  storeId: string;
}

interface Seller {
  id_funcionario: string;
  nome: string;
  cargo?: string;
}

interface Props {
  onCancel: () => void;
  onSave: (data: any) => void;
  vendedoresDisponiveis: Seller[];
  id_loja: string;
}

const NewCashier: React.FC<Props> = ({
  onCancel,
  onSave,
  vendedoresDisponiveis,
  id_loja,
}) => {
  const [vendedorSearchTerm, setVendedorSearchTerm] = useState<string>("");
  const [id_funcionario_responsavel, setId_funcionario] = useState<string>("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const filteredVendedores = useMemo(() => {
    if (!vendedorSearchTerm.trim()) return vendedoresDisponiveis;

    const term = vendedorSearchTerm.toLowerCase();
    return vendedoresDisponiveis.filter(
      (v) =>
        v.nome.toLowerCase().includes(term) ||
        (v.cargo && v.cargo.toLowerCase().includes(term)),
    );
  }, [vendedorSearchTerm, vendedoresDisponiveis]);

  const handleCreateCashier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    setError("");
    if (!id_funcionario_responsavel) {
      setFieldErrors({
        vendedorResponsavel: "Selecione um vendedor responsável.",
      });
      focusFirstError({
        vendedorResponsavel: "Selecione um vendedor responsável.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const payload = { id_funcionario_responsavel, id_loja };
      const response = await axios.post(
        "https://vl-store-v2.onrender.com/api/caixas",
        payload,
      );

      onSave(response.data);
    } catch (error) {
      setError("Erro ao abrir o caixa. Verifique os dados e tente novamente.");
      if (axios.isAxiosError(error)) {
        console.error(
          "Erro na requisição:",
          error.response?.data || error.message,
        );
      } else {
        console.error("Erro inesperado:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.cardTitle}>Abrir Novo Caixa</div>

        <form onSubmit={handleCreateCashier} noValidate>
          <p>* Campo obrigatório</p>
          <div className="row mb-3">
            <div className="col-md-12 position-relative">
              <label
                htmlFor="vendedorResponsavel"
                className="form-label text-white-75 small"
              >
                Vendedor Responsável *
              </label>
              <SearchCombobox
                id="vendedorResponsavel"
                value={vendedorSearchTerm}
                disabled={isLoading}
                error={fieldErrors.vendedorResponsavel}
                options={filteredVendedores.map((v) => ({
                  id: v.id_funcionario,
                  label: `${v.nome}${v.cargo ? ` (${v.cargo})` : ""}`,
                }))}
                onChange={(value) => {
                  setVendedorSearchTerm(value);
                  setId_funcionario("");
                  setFieldErrors({});
                }}
                onSelect={(id, label) => {
                  setId_funcionario(id);
                  setVendedorSearchTerm(label);
                  setFieldErrors({});
                }}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="alert alert-danger alert-inline">
              {error}
            </div>
          )}
          <div className="d-flex justify-content-center mt-4">
            <button
              className="btn primaria mx-2 footerButton"
              type="button"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              className="btn primaria mx-2 footerButton"
              type="submit"
              disabled={isLoading || !id_funcionario_responsavel}
            >
              {isLoading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCashier;
