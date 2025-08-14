import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

export const handler = async (event: any, context: any) => {
  try {
    // Configurar cliente Supabase
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Credenciais Supabase não encontradas" }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ler script SQL
    const sqlScript = readFileSync(
      join(process.cwd(), "SQL_INTEGRITY_FIXES.sql"),
      "utf8",
    );

    console.log("🔧 Executando correções de integridade do banco...");

    // Dividir script em comandos individuais para melhor controle
    const commands = sqlScript
      .split("-- =============================================")
      .filter((cmd) => cmd.trim().length > 0);

    const results = [];

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (!command || command.startsWith("--") || command.startsWith("/*"))
        continue;

      try {
        console.log(`Executando comando ${i + 1}/${commands.length}...`);

        const { data, error } = await supabase.rpc("execute_sql", {
          query: command,
        });

        if (error) {
          console.error(`❌ Erro no comando ${i + 1}:`, error);
          results.push({
            command: i + 1,
            status: "error",
            error: error.message,
          });
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
          results.push({
            command: i + 1,
            status: "success",
            data,
          });
        }
      } catch (err) {
        console.error(`❌ Erro inesperado no comando ${i + 1}:`, err);
        results.push({
          command: i + 1,
          status: "error",
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    // Executar validação final
    console.log("🔍 Executando validação de integridade...");
    const { data: validationData, error: validationError } = await supabase.rpc(
      "validate_data_integrity",
    );

    if (validationError) {
      console.error("❌ Erro na validação:", validationError);
    } else {
      console.log("✅ Validação concluída:", validationData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Script de integridade executado",
        results,
        validation: validationData,
        validationError,
      }),
    };
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao executar script de integridade",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      }),
    };
  }
};
