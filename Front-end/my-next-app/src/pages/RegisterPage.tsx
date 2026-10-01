import React, { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { IMaskInput } from "react-imask";
import Link from "next/link";
import "../../public/css/login.css"; // Importação do CSS específico

import { StoreRegistration as StoreRegistrationData } from "../domain/interfaces/store-registration-interface";
import {
  isValidDateBR,
  isValidPhone,
  PASSWORD_RULE_TEXT,
  focusFirstError,
  isValidEmail,
  isValidCpfCnpj,
  isValidPassword,
  extractDigitsOnly,
  convertToISODate,
} from "../utils/validationUtils";

const StoreRegistration: React.FC = () => {
  const router = useRouter();

  const [storeName, setStoreName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [telephone, setTelephone] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const pushInitialPage = () => {
    router.push("/initialPage");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const errors: Record<string, string> = {};
    if (!storeName.trim()) errors.storeName = "Informe o nome da loja.";
    if (!isValidEmail(email)) errors.email = "Informe um e-mail válido.";
    if (!isValidCpfCnpj(cpfCnpj))
      errors.cpfCnpj =
        "Informe um CPF/CNPJ válido, incluindo os dígitos verificadores.";
    if (!isValidDateBR(birthDate))
      errors.birthDate =
        "Informe uma data de nascimento existente e não futura (DD/MM/AAAA).";
    if (!isValidPhone(extractDigitsOnly(telephone)))
      errors.telephone = "Informe o telefone com DDD e 10 ou 11 dígitos.";
    if (!isValidPassword(password))
      errors.password = "A senha não atende à regra indicada abaixo do campo.";
    if (!confirmPassword || password !== confirmPassword)
      errors.confirmPassword = "As senhas não coincidem.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }

    const storeData: StoreRegistrationData = {
      nome: storeName,
      senha: password,
      email: email.toLowerCase(),
      cpf_cnpj_proprietario_loja: extractDigitsOnly(cpfCnpj),
      data_nasc_proprietario: new Date(
        convertToISODate(birthDate),
      ).toISOString(),
      telefone: extractDigitsOnly(telephone),
    };

    try {
      setLoading(true);
      await axios.post("https://vl-store-v2.onrender.com/api/lojas", storeData);

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.push("/initialPage");
      }, 2000);
    } catch (error) {
      setLoading(false);

      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const conflicts: Record<string, [string, string]> = {
          "Email já está em uso": ["email", "Este e-mail já está cadastrado."],
          "CPF/CNPJ já cadastrado": [
            "cpfCnpj",
            "Este CPF/CNPJ já está cadastrado.",
          ],
          "Telefone já cadastrado": [
            "telephone",
            "Este telefone já está cadastrado.",
          ],
        };
        const conflict = conflicts[String(error.response.data?.message)];
        if (conflict) {
          const errors = { [conflict[0]]: conflict[1] };
          setFieldErrors(errors);
          focusFirstError(errors);
          return;
        }
      }
      setError(
        axios.isAxiosError(error) && error.response?.status === 409
          ? "E-mail ou CPF/CNPJ já cadastrado."
          : "Não foi possível cadastrar. Verifique os dados e sua conexão e tente novamente.",
      );
    }
  };

  return (
    <div className="d-flex justify-content-between flex-column min-vh-100">
      <header className="w-100">
        <div className="header-panel">
          <img
            src="/vl-store-logo-white.svg"
            alt="Logo"
            className="img logo"
            onClick={pushInitialPage}
            style={{ cursor: "pointer" }}
          />
        </div>
      </header>

      <div className="mx-auto login-register-block fine-transparent-border white-light d-flex justify-content-center align-items-center overflow-hidden w-75">
        <div className="row w-100 shadow overflow-hidden">
          {/* Painel de Boas-Vindas */}
          <div className="col-md-6 text-white d-flex flex-column justify-content-center align-items-center text-center p-4 quartenary">
            <h4 className="m-3">Bem-vindo!</h4>
            <p className="w-75">
              Já possui conta? <Link href="/loginPage">Entrar</Link>
            </p>
          </div>

          {/* Formulário de Registro */}
          <div className="col-md-6 p-4 terciary">
            <h3 className="text-center mb-4">Cadastro</h3>

            {success && (
              <div role="status" className="alert alert-success alert-inline">
                Loja cadastrada com sucesso! Redirecionando para o login...
              </div>
            )}

            <form
              noValidate
              onChangeCapture={(e) =>
                clearFieldError((e.target as HTMLInputElement).id)
              }
              onSubmit={handleRegister}
            >
              <p>* Campo obrigatório</p>
              <div className="input-block row mb-2 align-items-center mb-3">
                <div className="col-12 w-100">
                  <label className="form-label" htmlFor={"storeName"}>
                    Nome da loja *
                  </label>
                  <input
                    id={"storeName"}
                    aria-invalid={!!fieldErrors["storeName"]}
                    aria-describedby={
                      fieldErrors["storeName"] ? "storeName-erro" : undefined
                    }
                    type="text"
                    className={
                      "form-control input-form" +
                      (fieldErrors["storeName"] ? " is-invalid" : "")
                    }
                    placeholder="Digite o nome da sua loja"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    disabled={loading}
                    required
                  />
                  {fieldErrors["storeName"] && (
                    <div
                      id={"storeName-erro"}
                      className="invalid-feedback d-block"
                    >
                      {fieldErrors["storeName"]}
                    </div>
                  )}
                </div>
              </div>

              <div className="input-block row mb-2 align-items-center mb-3">
                <div className="col-12 w-100">
                  <label className="form-label" htmlFor={"email"}>
                    E-mail *
                  </label>
                  <input
                    id={"email"}
                    aria-invalid={!!fieldErrors["email"]}
                    aria-describedby={
                      fieldErrors["email"] ? "email-erro" : undefined
                    }
                    type="email"
                    className={
                      "form-control input-form" +
                      (fieldErrors["email"] ? " is-invalid" : "")
                    }
                    placeholder="Digite o seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  {fieldErrors["email"] && (
                    <div id={"email-erro"} className="invalid-feedback d-block">
                      {fieldErrors["email"]}
                    </div>
                  )}
                </div>
              </div>

              <div className="input-block row mb-2 align-items-center mb-3">
                <div className="col-12 w-100">
                  <label className="form-label" htmlFor={"cpfCnpj"}>
                    CPF/CNPJ *
                  </label>
                  <IMaskInput
                    id={"cpfCnpj"}
                    aria-invalid={!!fieldErrors["cpfCnpj"]}
                    aria-describedby={
                      fieldErrors["cpfCnpj"] ? "cpfCnpj-erro" : undefined
                    }
                    mask={[
                      { mask: "000.000.000-00" },
                      { mask: "00.000.000/0000-00" },
                    ]}
                    className={
                      "form-control input-form" +
                      (fieldErrors["cpfCnpj"] ? " is-invalid" : "")
                    }
                    placeholder="Digite o CPF ou CNPJ"
                    value={cpfCnpj}
                    onAccept={(value: string) => {
                      setCpfCnpj(value);
                      clearFieldError("cpfCnpj");
                    }}
                    unmask={false} // Mantém a formatação
                    definitions={{
                      "#": /[0-9]/,
                    }}
                    overwrite
                    lazy={false} // Mostra a máscara imediatamente
                    disabled={loading}
                    required
                  />
                  {fieldErrors["cpfCnpj"] && (
                    <div
                      id={"cpfCnpj-erro"}
                      className="invalid-feedback d-block"
                    >
                      {fieldErrors["cpfCnpj"]}
                    </div>
                  )}
                </div>
              </div>

              <div className="input-block row mb-2 align-items-center mb-3">
                <div className="col-12 w-100">
                  <label className="form-label" htmlFor={"birthDate"}>
                    Data de nascimento *
                  </label>
                  <IMaskInput
                    id={"birthDate"}
                    aria-invalid={!!fieldErrors["birthDate"]}
                    aria-describedby={
                      fieldErrors["birthDate"] ? "birthDate-erro" : undefined
                    }
                    mask="00/00/0000"
                    className={
                      "form-control input-form" +
                      (fieldErrors["birthDate"] ? " is-invalid" : "")
                    }
                    placeholder="Data de nascimento"
                    value={birthDate}
                    onAccept={(value: string) => {
                      setBirthDate(value);
                      clearFieldError("birthDate");
                    }}
                    disabled={loading}
                    required
                  />
                  {fieldErrors["birthDate"] && (
                    <div
                      id={"birthDate-erro"}
                      className="invalid-feedback d-block"
                    >
                      {fieldErrors["birthDate"]}
                    </div>
                  )}
                </div>
              </div>

              <div className="input-block row mb-2 align-items-center mb-3">
                <div className="col-12 w-100">
                  <label className="form-label" htmlFor={"telephone"}>
                    Telefone *
                  </label>
                  <IMaskInput
                    id={"telephone"}
                    aria-invalid={!!fieldErrors["telephone"]}
                    aria-describedby={
                      fieldErrors["telephone"] ? "telephone-erro" : undefined
                    }
                    mask={[
                      { mask: "(00) 0000-0000" },
                      { mask: "(00) 00000-0000" },
                    ]}
                    className={
                      "form-control input-form" +
                      (fieldErrors["telephone"] ? " is-invalid" : "")
                    }
                    placeholder="Telefone (Ex: (11) 99999-9999)"
                    value={telephone}
                    onAccept={(value: string) => {
                      setTelephone(value);
                      clearFieldError("telephone");
                    }}
                    disabled={loading}
                    required
                  />
                  {fieldErrors["telephone"] && (
                    <div
                      id={"telephone-erro"}
                      className="invalid-feedback d-block"
                    >
                      {fieldErrors["telephone"]}
                    </div>
                  )}
                </div>
              </div>

              <div className="input-block row mb-2 align-items-center mb-3">
                <div className="col-12 w-100">
                  <label className="form-label" htmlFor={"password"}>
                    Senha *
                  </label>
                  <input
                    id={"password"}
                    aria-invalid={!!fieldErrors["password"]}
                    aria-describedby={
                      fieldErrors["password"]
                        ? "password-ajuda password-erro"
                        : "password-ajuda"
                    }
                    type="password"
                    className={
                      "form-control input-form" +
                      (fieldErrors["password"] ? " is-invalid" : "")
                    }
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <p id="password-ajuda" className="form-text text-light">
                    {PASSWORD_RULE_TEXT}
                  </p>
                  {fieldErrors["password"] && (
                    <div
                      id={"password-erro"}
                      className="invalid-feedback d-block"
                    >
                      {fieldErrors["password"]}
                    </div>
                  )}
                </div>
              </div>

              <div className="input-block row mb-2 align-items-center mb-3">
                <div className="col-12 w-100">
                  <label className="form-label" htmlFor={"confirmPassword"}>
                    Confirmar senha *
                  </label>
                  <input
                    id={"confirmPassword"}
                    aria-invalid={!!fieldErrors["confirmPassword"]}
                    aria-describedby={
                      fieldErrors["confirmPassword"]
                        ? "confirmPassword-erro"
                        : undefined
                    }
                    type="password"
                    className={
                      "form-control input-form" +
                      (fieldErrors["confirmPassword"] ? " is-invalid" : "")
                    }
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  {fieldErrors["confirmPassword"] && (
                    <div
                      id={"confirmPassword-erro"}
                      className="invalid-feedback d-block"
                    >
                      {fieldErrors["confirmPassword"]}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div role="alert" className="alert alert-danger alert-inline">
                  {error}
                </div>
              )}
              <div className="row mt-3">
                <button
                  type="submit"
                  className="btn primaria col-11 col-lg-5 mx-auto d-flex justify-content-center align-items-center"
                  disabled={loading}
                >
                  {loading ? "Cadastrando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <footer className="w-100">
        <div className="footer-panel">
          {/* <button
            className="btn primaria footerButton col-3 mx-auto d-flex justify-content-center align-items-center"
            onClick={pushInitialPage}
          >
            Entrar como visitante
          </button> */}
        </div>
      </footer>
    </div>
  );
};

export default StoreRegistration;
