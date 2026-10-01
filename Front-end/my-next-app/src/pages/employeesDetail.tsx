import { IMaskInput } from "react-imask";
import {
  isValidEmail,
  isValidCpf,
  isValidPhone,
  isValidDateBR,
  extractDigitsOnly,
  focusFirstError,
} from "../utils/validationUtils";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import "../../public/css/products.css";
import "../../public/css/general.css";

const EmployeeDetail = () => {
  const router = useRouter();

  const [employeeData, setEmployeeData] = useState({
    id_funcionario: "",
    nome: "",
    email: "",
    cpf: "",
    data_nascimento: "", // será YYYY-MM-DD
    telefone: "",
    id_loja: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const [originalData, setOriginalData] = useState<typeof employeeData | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leaveRequested, setLeaveRequested] = useState(false);
  const hasChanges =
    !!originalData &&
    JSON.stringify(employeeData) !== JSON.stringify(originalData);

  // Data original como veio do backend (ex: "0200-07-20T03:06:28.000Z")
  const [originalDate, setOriginalDate] = useState<string>("");

  // Formata data para input type="date"
  const formatDateToInput = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Mantém o horário original, apenas atualiza dia/mês/ano
  const updateDateKeepingTime = (
    originalDateString: string,
    newDateInput: string,
  ): string => {
    const original = new Date(originalDateString);
    if (Number.isNaN(original.getTime()))
      return new Date(`${newDateInput}T00:00:00`).toISOString();
    const [year, month, day] = newDateInput.split("-");

    original.setFullYear(Number(year), Number(month) - 1, Number(day));

    return original.toISOString(); // Retorna no formato ISO completo
  };

  // Carrega os dados iniciais
  useEffect(() => {
    const employee = localStorage.getItem("selectedEmployee");
    if (employee) {
      const employeObj = JSON.parse(employee);
      const data = employeObj.data;

      const rawDate = data.data_nascimento;
      setOriginalDate(rawDate);

      const parsed = {
        id_funcionario: data.id_funcionario || "",
        nome: data.nome || "",
        email: data.email || "",
        cpf: extractDigitsOnly(data.cpf || ""),
        data_nascimento: formatDateToInput(rawDate),
        telefone: extractDigitsOnly(data.telefone || ""),
        id_loja: data.id_loja,
      };
      setEmployeeData(parsed);
      setOriginalData(parsed);
    }
  }, []);

  // Verifica autenticação
  useEffect(() => {
    const jwtToken = localStorage.getItem("jwtToken");
    const userData = localStorage.getItem("userData");
    if (!jwtToken || !userData) router.push("/initialPage");
  }, []);

  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem("jwtToken");
    return {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const saveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalData || isSaving || !hasChanges) return;
    setError("");
    setSuccess(false);
    const errors: Record<string, string> = {};
    if (!employeeData.nome.trim())
      errors.nome = "Informe o nome do funcionário.";
    if (!isValidEmail(employeeData.email))
      errors.email = "Informe um e-mail válido.";
    if (!isValidCpf(extractDigitsOnly(employeeData.cpf)))
      errors.cpf = "Informe um CPF válido, incluindo os dígitos verificadores.";
    if (!isValidPhone(extractDigitsOnly(employeeData.telefone)))
      errors.telefone = "Informe o telefone com DDD e 10 ou 11 dígitos.";
    if (
      !isValidDateBR(
        employeeData.data_nascimento.split("-").reverse().join("/"),
      )
    )
      errors.data_nascimento =
        "Informe uma data de nascimento existente e não futura.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    const payload: Record<string, string> = {};
    for (const key of [
      "nome",
      "email",
      "cpf",
      "telefone",
      "data_nascimento",
    ] as const) {
      if (employeeData[key] !== originalData[key])
        payload[key] =
          key === "data_nascimento"
            ? updateDateKeepingTime(originalDate, employeeData[key])
            : key === "cpf" || key === "telefone"
              ? extractDigitsOnly(employeeData[key])
              : employeeData[key];
    }
    setIsSaving(true);
    try {
      await axios.patch(
        `https://vl-store-v2.onrender.com/api/funcionarios/loja/${employeeData.id_loja}/funcionario/${employeeData.id_funcionario}`,
        payload,
        { headers: getAuthHeaders() },
      );
      setOriginalData({ ...employeeData });
      if (payload.data_nascimento) setOriginalDate(payload.data_nascimento);
      localStorage.setItem(
        "selectedEmployee",
        JSON.stringify({
          data: {
            ...employeeData,
            data_nascimento: payload.data_nascimento || originalDate,
          },
        }),
      );
      setSuccess(true);
      if (leaveRequested) router.push("/employeesPage");
    } catch {
      setError(
        "Não foi possível salvar o funcionário. Verifique os dados e sua conexão e tente novamente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const cancelChanges = () => {
    if (originalData) setEmployeeData({ ...originalData });
    setFieldErrors({});
    setError("");
    setSuccess(false);
    setLeaveRequested(false);
  };

  const deleteEmployee = async () => {
    try {
      await axios.delete(
        `https://vl-store-v2.onrender.com/api/funcionarios/loja/${employeeData.id_loja}/funcionario/${employeeData.id_funcionario}`,
        { headers: getAuthHeaders() },
      );
      router.push("/employeesPage");
    } catch (err) {
      console.error("Erro ao deletar funcionário:", err);
      setError("Erro ao deletar funcionário");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center w-100">
      <div className="product-page d-flex justify-content-center align-items-center terciary p-4 flex-column rounded-5 white-light">
        <h3 className="col-12 text-center">Editar funcionário</h3>

        <form
          noValidate
          onChangeCapture={(e) =>
            clearFieldError((e.target as HTMLInputElement).id)
          }
          onSubmit={saveChanges}
          className="row w-100 justify-content-between"
        >
          <p>* Campo obrigatório</p>
          <div className="col-12 w-100">
            <div className="row product-info w-100 d-flex justify-content-between align-items-between">
              <div className="mx-auto col-12 p-4 info-base row">
                <h5 className="text-center mb-2">Informações do Funcionário</h5>

                <label className="form-label" htmlFor={"nome"}>
                  Nome *
                </label>
                <input
                  disabled={isSaving}
                  id={"nome"}
                  aria-invalid={!!fieldErrors["nome"]}
                  aria-describedby={
                    fieldErrors["nome"] ? "nome-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["nome"] ? " is-invalid" : "")
                  }
                  name="nome"
                  placeholder="Ex: João da Silva"
                  value={employeeData.nome}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["nome"] && (
                  <div id={"nome-erro"} className="invalid-feedback d-block">
                    {fieldErrors["nome"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"email"}>
                  E-mail *
                </label>
                <input
                  disabled={isSaving}
                  id={"email"}
                  aria-invalid={!!fieldErrors["email"]}
                  aria-describedby={
                    fieldErrors["email"] ? "email-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["email"] ? " is-invalid" : "")
                  }
                  name="email"
                  placeholder="Ex: joao@email.com"
                  value={employeeData.email}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["email"] && (
                  <div id={"email-erro"} className="invalid-feedback d-block">
                    {fieldErrors["email"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"cpf"}>
                  CPF *
                </label>
                <IMaskInput
                  unmask={true}
                  disabled={isSaving}
                  mask="000.000.000-00"
                  id={"cpf"}
                  aria-invalid={!!fieldErrors["cpf"]}
                  aria-describedby={fieldErrors["cpf"] ? "cpf-erro" : undefined}
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["cpf"] ? " is-invalid" : "")
                  }
                  name="cpf"
                  placeholder="Ex: 123.456.789-00"
                  value={employeeData.cpf}
                  onAccept={(value: string) => {
                    setEmployeeData((prev) => ({
                      ...prev,
                      cpf: extractDigitsOnly(value),
                    }));
                    clearFieldError("cpf");
                  }}
                  required
                />
                {fieldErrors["cpf"] && (
                  <div id={"cpf-erro"} className="invalid-feedback d-block">
                    {fieldErrors["cpf"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"data_nascimento"}>
                  Data de nascimento *
                </label>
                <input
                  disabled={isSaving}
                  id={"data_nascimento"}
                  aria-invalid={!!fieldErrors["data_nascimento"]}
                  aria-describedby={
                    fieldErrors["data_nascimento"]
                      ? "data_nascimento-erro"
                      : undefined
                  }
                  type="date"
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["data_nascimento"] ? " is-invalid" : "")
                  }
                  name="data_nascimento"
                  value={employeeData.data_nascimento}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["data_nascimento"] && (
                  <div
                    id={"data_nascimento-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["data_nascimento"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"telefone"}>
                  Telefone *
                </label>
                <IMaskInput
                  unmask={true}
                  disabled={isSaving}
                  mask={[
                    { mask: "(00) 0000-0000" },
                    { mask: "(00) 00000-0000" },
                  ]}
                  id={"telefone"}
                  aria-invalid={!!fieldErrors["telefone"]}
                  aria-describedby={
                    fieldErrors["telefone"] ? "telefone-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["telefone"] ? " is-invalid" : "")
                  }
                  name="telefone"
                  placeholder="Ex: (11) 91234-5678"
                  value={employeeData.telefone}
                  onAccept={(value: string) => {
                    setEmployeeData((prev) => ({
                      ...prev,
                      telefone: extractDigitsOnly(value),
                    }));
                    clearFieldError("telefone");
                  }}
                />
                {fieldErrors["telefone"] && (
                  <div
                    id={"telefone-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["telefone"]}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="alert alert-danger alert-inline col-12 text-center mt-2"
            >
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success alert-inline" role="status">
              Alterações salvas.
            </div>
          )}
          {leaveRequested && (
            <div className="alert alert-warning alert-inline" role="alert">
              Há alterações não salvas.{" "}
              <button
                type="submit"
                className="btn btn-sm btn-outline-dark ms-2"
                disabled={isSaving}
              >
                Salvar
              </button>{" "}
              <button
                type="button"
                className="btn btn-sm btn-outline-dark ms-2"
                disabled={isSaving}
                onClick={() => router.push("/employeesPage")}
              >
                Descartar
              </button>
            </div>
          )}
          <button
            type="submit"
            className="btn primaria"
            disabled={!hasChanges || isSaving}
          >
            Salvar alterações
          </button>
          <button
            type="button"
            className="btn primaria"
            disabled={!hasChanges || isSaving}
            onClick={cancelChanges}
          >
            Cancelar alterações
          </button>
          <div className="d-flex justify-content-between w-100 mt-3">
            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              onClick={() =>
                hasChanges
                  ? setLeaveRequested(true)
                  : router.push("/employeesPage")
              }
            >
              Voltar
            </button>

            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              disabled={isSaving}
              onClick={deleteEmployee}
            >
              Deletar Funcionário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeDetail;
