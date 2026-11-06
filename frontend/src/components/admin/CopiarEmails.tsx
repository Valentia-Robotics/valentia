"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { BotonAdmin } from "./BotonAdmin";

/** Copia todos los emails separados por comas, listos para pegar en «CCO» del correo */
export function CopiarEmails({ emails }: { emails: string[] }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    await navigator.clipboard.writeText(emails.join(", "));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <BotonAdmin onClick={copiar}>
      {copiado ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {copiado ? "Copiados" : "Copiar emails"}
    </BotonAdmin>
  );
}
