import { GoogleGenAI } from "@google/genai";
import { AppState, FileAttachment } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants';
// @ts-ignore
import mammoth from "mammoth";

const apiKey = process.env.API_KEY;

// Helper to remove the Data URL prefix (e.g., "data:image/png;base64,")
const stripBase64Header = (base64: string) => {
  return base64.split(',')[1];
};

// Helper to convert base64 string to ArrayBuffer for Mammoth
const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const generateDischargeLetter = async (
  state: AppState,
  attachments: FileAttachment[]
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Prepare the System Instruction
  const targetLanguage = state.language === 'de' ? 'GERMAN (Deutsch)' : 'ENGLISH';
  
  let systemInstruction = SYSTEM_INSTRUCTION
    .replace('{{language}}', targetLanguage)
    .replace('{{audience}}', state.audience)
    .replace('{{dischargeDate}}', state.patient.dischargeDate || 'Date: _____________');
    
  // Global replace to ensure all instances are covered
  systemInstruction = systemInstruction.split('{{language}}').join(targetLanguage);
  systemInstruction = systemInstruction.split('{{audience}}').join(state.audience);
  systemInstruction = systemInstruction.split('{{dischargeDate}}').join(state.patient.dischargeDate || 'Date: _____________');

  // 2. Prepare the Content Parts
  const parts: any[] = [];

  // Determine Validation Logic based on whether user filled the form
  const hasPatientInfo = state.patient.firstName || state.patient.lastName || state.patient.dob;
  
  const validationInstruction = hasPatientInfo
    ? `**CRITICAL VALIDATION:**
       - You MUST check the Patient Name and Date of Birth in each document.
       - **COMPARE** with Form Data: "${state.patient.firstName} ${state.patient.lastName}", DOB: ${state.patient.dob}.
       - **IF** a document contains a Name or DOB that **CLEARLY CONTRADICTS** the Form Data, **IGNORE** that document.
       - **IF** it matches OR is ambiguous/missing in the doc, **USE IT**.`
    : `**VALIDATION:** Patient demographics were not provided in the input form. **TRUST THE DOCUMENTS** and extract patient details from them.`;

  // 2.1 Structured Text Input
  let clinicalCourseText = state.clinical.clinicalCourse || '';
  
  if (state.useStandardCourse) {
    clinicalCourseText += `\n\n[INSTRUCTION]: The user requested a STANDARD CLINICAL COURSE (complications-free). 
    - Write this section in **${targetLanguage}**.
    - Use **QUALITATIVE** descriptions (e.g. "pain was well controlled", "wound healing primary", "mobilization successful").
    - **DO NOT** invent specific numbers, dates, or lab values.
    - Fill in the narrative based on the Diagnosis and Operation provided.`;
  } else if (!clinicalCourseText) {
    clinicalCourseText = "Not provided. If information is available in attached documents, summarize it here.";
  }

  const textPrompt = `
PLEASE GENERATE A DISCHARGE LETTER BASED ON THE FOLLOWING INFORMATION.

*** CRITICAL INSTRUCTIONS ***
1. **LANGUAGE:** The output must be strictly in: **${targetLanguage}**.
   - If input is German, TRANSLATE to ${targetLanguage}.
   - If input is English, TRANSLATE to ${targetLanguage}.
2. **AUDIENCE:** Target audience is: **${state.audience.toUpperCase()}**.
   - If PATIENT: Explain ALL technical terms in brackets.
3. **DATA FIDELITY:** 
   - DO NOT INVENT NUMBERS. Use "General/Qualitative Formulations" if data is missing.
   - Example: "Lab values showed no significant abnormalities" instead of inventing "CRP 3.0".
4. **SIGNATORY:**
   - Translate the Doctor's Position to ${targetLanguage} (e.g. "Facharzt" -> "Specialist", "Oberarzt" -> "Senior Physician").

${validationInstruction}

DATA MERGING INSTRUCTIONS:
1. **Comorbidities:** Extract pre-existing conditions from "Previous Letters" (Vorbriefe).
2. **Clinical Course:** STRICTLY SEPARATE current events from past history. Only describe the current stay in "Verlauf".
3. **Labs:** Integrate lab trends into the "Verlauf".
4. **Medication:** Separate "Admission Medication" (from history) and "Discharge Medication".
5. **Recommendations:** ONLY for the current stay.

--- SIGNATORY ---
Doctor: ${state.doctorName || 'Not provided'}
Position (Input): ${state.doctorPosition || ''} (Please translate this to ${targetLanguage})

--- PATIENT DEMOGRAPHICS (Form Input) ---
First Name: ${state.patient.firstName || '[Empty]'}
Last Name: ${state.patient.lastName || '[Empty]'}
Birthdate: ${state.patient.dob || '[Empty]'}
Admission Date: ${state.patient.admissionDate || '[Empty]'}
Discharge Date: ${state.patient.dischargeDate || '[Empty]'}

--- CLINICAL INFORMATION ---
Diagnosis:
${state.clinical.diagnosis || 'Not provided'}

Anamnesis (History):
${state.clinical.anamnesis || 'Not provided'}

Findings (Physical, Lab, etc.):
${state.clinical.findings || 'Not provided'}

Operation / Procedures:
${state.clinical.operation || 'Not provided'}

Clinical Course:
${clinicalCourseText}

Medication:
${state.clinical.medication || 'Not provided'}

Recommendations / Follow-up:
${state.clinical.recommendations || 'Not provided'}

--- ATTACHED DOCUMENTS & IMAGES ---
The following files are attached. Please extract relevant information from VALID documents to supplement the text fields above.
`;

  parts.push({ text: textPrompt });

  // 2.2 Attachments
  
  for (const att of attachments) {
    // Check for Word Document MIME types
    if (
      att.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      att.mimeType === 'application/msword'
    ) {
      try {
        const arrayBuffer = base64ToArrayBuffer(stripBase64Header(att.base64));
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        
        parts.push({ 
          text: `\n[ATTACHMENT: ${att.category.toUpperCase()} - Filename: ${att.file.name} (Text Extracted from Word Doc)]\n${result.value}\n` 
        });
      } catch (err) {
        console.error("Failed to parse Word document:", err);
        parts.push({ 
          text: `\n[ERROR: Could not parse Word document: ${att.file.name}. Ensure it is a valid .docx file.]\n` 
        });
      }
    } else {
      // Handle PDFs and Images via inlineData (supported by Gemini)
      parts.push({ 
        text: `\n[ATTACHMENT: ${att.category.toUpperCase()} - Filename: ${att.file.name}]\n` 
      });
      
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: stripBase64Header(att.base64),
        },
      });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Low temperature for factual consistency
      },
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate discharge letter.");
  }
};