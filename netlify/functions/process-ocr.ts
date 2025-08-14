import { createClient } from '@supabase/supabase-js';

export const handler = async (event: any, context: any) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { documentId, filePath } = JSON.parse(event.body);

    if (!documentId || !filePath) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'documentId e filePath são obrigatórios' })
      };
    }

    // Configurar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Configuração Supabase não encontrada' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔍 Iniciando OCR para documento ${documentId}, arquivo: ${filePath}`);

    // Atualizar status para processando
    await supabase
      .schema('legalflow')
      .from('documentos')
      .update({ 
        ocr_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    try {
      // Baixar o arquivo do storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) {
        throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`);
      }

      console.log(`📁 Arquivo baixado: ${fileData.size} bytes`);

      // Simular processamento OCR (em produção, usar serviço real como Tesseract.js, Google Vision API, etc.)
      const ocrText = await processOCRContent(fileData, filePath);

      console.log(`📝 OCR concluído: ${ocrText.length} caracteres extraídos`);

      // Atualizar documento com texto OCR
      const { error: updateError } = await supabase
        .schema('legalflow')
        .from('documentos')
        .update({ 
          ocr_text: ocrText,
          ocr_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) {
        throw new Error(`Erro ao atualizar documento: ${updateError.message}`);
      }

      // Registrar log de processamento
      await supabase
        .schema('legalflow')
        .from('documento_logs')
        .insert({
          document_id: documentId,
          action: 'ocr_completed',
          details: {
            characters_extracted: ocrText.length,
            processing_time: Date.now(),
            file_path: filePath
          },
          created_at: new Date().toISOString()
        });

      console.log(`✅ OCR concluído com sucesso para documento ${documentId}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          documentId,
          charactersExtracted: ocrText.length,
          message: 'OCR processado com sucesso'
        })
      };

    } catch (processError) {
      console.error(`❌ Erro no processamento OCR:`, processError);

      // Atualizar status para falha
      await supabase
        .schema('legalflow')
        .from('documentos')
        .update({ 
          ocr_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      // Registrar log de erro
      await supabase
        .schema('legalflow')
        .from('documento_logs')
        .insert({
          document_id: documentId,
          action: 'ocr_failed',
          details: {
            error: processError instanceof Error ? processError.message : 'Erro desconhecido',
            file_path: filePath
          },
          created_at: new Date().toISOString()
        });

      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Falha no processamento OCR',
          details: processError instanceof Error ? processError.message : 'Erro desconhecido'
        })
      };
    }

  } catch (error) {
    console.error('❌ Erro geral na função OCR:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    };
  }
};

// Função para processar OCR do conteúdo
async function processOCRContent(fileData: Blob, filePath: string): Promise<string> {
  // Determinar tipo de arquivo
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  
  try {
    if (fileExtension === 'pdf') {
      return await processPDFOCR(fileData);
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension || '')) {
      return await processImageOCR(fileData);
    } else if (['doc', 'docx', 'txt'].includes(fileExtension || '')) {
      return await processTextDocument(fileData);
    } else {
      throw new Error(`Tipo de arquivo não suportado para OCR: ${fileExtension}`);
    }
  } catch (error) {
    console.error('Erro no processamento específico do OCR:', error);
    throw error;
  }
}

// Simular OCR para PDF
async function processPDFOCR(fileData: Blob): Promise<string> {
  // Em produção, usar biblioteca como pdf-parse + tesseract.js
  // Por agora, simular extração de texto
  
  const simulatedText = `
DOCUMENTO PDF PROCESSADO VIA OCR

Este é um texto extraído via OCR de um documento PDF.
O sistema identificou o seguinte conteúdo:

- Título do documento
- Parágrafos de texto
- Possíveis tabelas e listas
- Metadados do documento

Data de processamento: ${new Date().toLocaleString('pt-BR')}
Tamanho do arquivo: ${(fileData.size / 1024).toFixed(2)} KB

[SIMULAÇÃO - Em produção, usar OCR real]
  `.trim();

  // Simular tempo de processamento
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return simulatedText;
}

// Simular OCR para imagens
async function processImageOCR(fileData: Blob): Promise<string> {
  // Em produção, usar Tesseract.js ou Google Vision API
  
  const simulatedText = `
IMAGEM PROCESSADA VIA OCR

Texto extraído da imagem:
- Título ou cabeçalho identificado
- Texto principal do documento
- Possíveis números e códigos
- Assinaturas ou carimbos detectados

Características da imagem:
- Tamanho: ${(fileData.size / 1024).toFixed(2)} KB
- Processamento: ${new Date().toLocaleString('pt-BR')}

[SIMULAÇÃO - Em produção, usar OCR real]
  `.trim();

  // Simular tempo de processamento
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return simulatedText;
}

// Processar documentos de texto
async function processTextDocument(fileData: Blob): Promise<string> {
  try {
    // Para documentos de texto, tentar ler diretamente
    const text = await fileData.text();
    
    if (text.length > 0) {
      return `DOCUMENTO DE TEXTO PROCESSADO

Conteúdo extraído:
${text}

Estatísticas:
- Caracteres: ${text.length}
- Palavras: ${text.split(/\s+/).length}
- Linhas: ${text.split('\n').length}
- Data de processamento: ${new Date().toLocaleString('pt-BR')}
      `.trim();
    } else {
      throw new Error('Documento de texto vazio');
    }
  } catch (error) {
    // Se não conseguir ler como texto, simular
    return `
DOCUMENTO DE TEXTO PROCESSADO

Arquivo detectado como documento de texto, mas houve dificuldade na leitura.
Possíveis causas:
- Codificação especial
- Formato proprietário
- Arquivo corrompido

Tamanho: ${(fileData.size / 1024).toFixed(2)} KB
Data: ${new Date().toLocaleString('pt-BR')}

[SIMULAÇÃO - Processamento alternativo necessário]
    `.trim();
  }
}
