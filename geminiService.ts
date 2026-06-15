
import { GoogleGenAI, Type } from "@google/genai";
import { AuditFeedback, AuditStatus, ConsistencyResult, Language } from "./types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const sendChatPrompt = async (
  messages: ChatMessage[],
  context: {
    type: 'single_file' | 'consistency';
    summaryOrAnalysis: string; // The previous analysis result to set context
    imageData?: string; // Optional: Base64 image for single file context
    mimeType?: string;
  },
  language: Language
): Promise<string> => {
  const ai = getAiClient();

  const langInstruction = language === 'zh' 
    ? "IMPORTANT: Response MUST be in Simplified Chinese (简体中文). Be professional and concise."
    : "IMPORTANT: Response MUST be in English. Be professional and concise.";

  let systemContext = "";
  if (context.type === 'single_file') {
    systemContext = `
      You are an expert SQE assistant. The user is asking questions about a specific PPAP document.
      
      Context - Previous AI Audit Findings:
      ${context.summaryOrAnalysis}
      
      ${langInstruction}
      Answer the user's latest question based on the document image and the previous findings.
    `;
  } else {
    systemContext = `
      You are an expert SQE assistant. The user is asking questions about a Consistency/Correlation Analysis between multiple documents.
      
      Context - Analysis Result:
      ${context.summaryOrAnalysis}
      
      ${langInstruction}
      Answer the user's latest question based on the provided analysis context.
    `;
  }

  // Construct the content parts
  const conversationText = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
  const lastUserMessage = messages[messages.length - 1].text;

  const finalPrompt = `
    ${systemContext}

    --- Conversation History ---
    ${conversationText}
    
    ---
    User's latest question: ${lastUserMessage}
  `;

  const parts: any[] = [{ text: finalPrompt }];

  if (context.imageData && context.mimeType) {
    const cleanBase64 = context.imageData.replace(/^data:.+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: context.mimeType,
        data: cleanBase64
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        // We want plain text for chat response
        responseMimeType: "text/plain", 
      }
    });

    return response.text || (language === 'zh' ? "抱歉，我无法回答这个问题。" : "Sorry, I cannot answer that.");
  } catch (error) {
    console.error("Chat Error:", error);
    return language === 'zh' ? "AI服务暂时不可用。" : "AI Service unavailable.";
  }
};

export const summarizeExemptions = async (
  documentName: string,
  exemptedIssues: string[],
  language: Language
): Promise<string> => {
  const ai = getAiClient();
  
  const langInstruction = language === 'zh' 
    ? "请用简体中文总结。"
    : "Please summarize in English.";

  const prompt = `
    You are an expert Automotive Supplier Quality Engineer (SQE).
    The user is reviewing an AI audit report for the document: "${documentName}".
    The AI originally flagged the following issues as non-compliant based on AIAG/IATF standards, but the user has decided to EXEMPT them based on their own specific company requirements.
    
    Issues to exempt:
    ${exemptedIssues.map(i => `- ${i}`).join('\n')}
    
    Your task is to summarize these specific issues into a concise, generalized "Exemption Rule" (1-2 sentences). 
    This rule will be saved and used in future AI audits to instruct the AI to ignore similar issues for this document type.
    
    ${langInstruction}
    Provide ONLY the summarized rule text, nothing else.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "text/plain",
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Summarize Exemptions Error:", error);
    throw error;
  }
};

export const auditPpapItem = async (
  itemName: string,
  base64Image: string,
  mimeType: string,
  language: Language,
  exemptions: string[] = [],
  focusRules: string[] = []
): Promise<AuditFeedback> => {
  const ai = getAiClient();
  
  // Clean base64 string if it includes the data URL prefix
  const cleanBase64 = base64Image.replace(/^data:.+;base64,/, '');

  const langInstruction = language === 'zh' 
    ? "OUTPUT LANGUAGE REQUIREMENT: The values for 'summary', 'findings', and 'recommendation' fields in the JSON response MUST be in Simplified Chinese (简体中文). The 'status' field MUST be in English (APPROVED, REJECTED, WARNING)."
    : "OUTPUT LANGUAGE REQUIREMENT: Provide all output in English.";

  // Get current date for context to avoid "future date" hallucinations
  const today = new Date().toISOString().split('T')[0];

  let exemptionPrompt = "";
  if (exemptions && exemptions.length > 0) {
    exemptionPrompt = language === 'zh'
      ? `\n**永久豁免清单 (Permanent Exemptions)**:\n用户已将以下问题列入豁免清单。在审核时，**绝对不要**将符合以下描述的问题标记为不符合项或发现项：\n${exemptions.map(e => `- ${e}`).join('\n')}\n`
      : `\n**Permanent Exemptions**:\nThe user has exempted the following issues. **DO NOT** flag any issues that match the following descriptions as findings or non-compliances:\n${exemptions.map(e => `- ${e}`).join('\n')}\n`;
  }

  let focusRulesPrompt = "";
  if (focusRules && focusRules.length > 0) {
    focusRulesPrompt = language === 'zh'
      ? `\n**重点关注问题清单 (Focus Issues)**:\n用户已将以下问题列入重点关注清单。在审核时，**必须仔细检查**是否符合以下描述的问题，如果存在，必须将其标记为不符合项或发现项：\n${focusRules.map(e => `- ${e}`).join('\n')}\n`
      : `\n**Focus Issues**:\nThe user has added the following issues to the focus list. **YOU MUST CAREFULLY CHECK** for any issues that match the following descriptions. If they exist, they MUST be flagged as findings or non-compliances:\n${focusRules.map(e => `- ${e}`).join('\n')}\n`;
  }

  // Specific check items logic
  const lowerName = itemName.toLowerCase();
  const isCoverSheet = lowerName.includes("cover sheet") || itemName.includes("封面");
  const isDesignRelease = lowerName.includes("design release") || itemName.includes("设计发布") || lowerName.includes("drawing") || itemName.includes("图纸");
  const isFlowChart = lowerName.includes("flow chart") || itemName.includes("流程图") || lowerName.includes("process flow");
  const isControlPlan = lowerName.includes("control plan") || itemName.includes("控制计划");
  const isICL = lowerName.includes("important characteristics") || itemName.includes("特殊特性") || lowerName.includes("icl");
  const isPFMEA = lowerName.includes("pfmea") || itemName.includes("过程失效") || lowerName.includes("process fmea");
  const isDimensionCheck = lowerName.includes("dimension check") || itemName.includes("尺寸检查") || lowerName.includes("dimensional results");
  const isMSA = lowerName.includes("msa") || itemName.includes("measurement system") || itemName.includes("测量系统");
  const isSPC = lowerName.includes("capability") || lowerName.includes("spc") || lowerName.includes("cpk") || lowerName.includes("ppk") || itemName.includes("过程能力") || itemName.includes("初始过程能力");
  const isDFMEA = lowerName.includes("dfmea") || itemName.includes("设计失效") || lowerName.includes("design fmea");

  let specificTaskPrompt = "";
  
  if (isCoverSheet) {
    specificTaskPrompt = language === 'zh' 
      ? `针对“PPA报告封面”，请**罗列所有**不符合项，不要遗漏：
         1. **完整性**：检查是否所有必填项都已填写（如重量、IMDS ID、零件名称等）。
         2. **逻辑性**：提交等级是否勾选正确？签署日期是否合理？
         3. **签署**：供应商是否已有正式签署？`
      : `For "PPA Report Cover Sheet", list ALL findings exhaustively:
         1. Completeness: Are all fields filled (Weight, IMDS ID, etc.)?
         2. Logic: Is Submission Level correct? Are dates logical?
         3. Signatures: Is it signed by the supplier?`;
  } else if (isDesignRelease) {
    specificTaskPrompt = language === 'zh'
      ? `针对“设计发布/图纸”，作为SQE专家请**罗列所有**问题：
         1. **基础信息**：图框栏信息是否完整（零件号、版本、日期）？
         2. **公差与标准**：是否有未标注公差的尺寸？通用公差标准是否明确？
         3. **特殊特性**：特殊特性符号（SC/CC）是否定义清晰？
         4. **专家判断**：是否存在设计不合理或加工困难的特征？`
      : `For "Design Release/Drawing", list ALL findings exhaustively:
         1. Basic Info: Is Title Block complete?
         2. Tolerances: Are all dims toleranced? Is general tolerance standard specified?
         3. Special Characteristics: Are SC/CC symbols clear?
         4. Expert Judgment: Are there manufacturability issues?`;
  } else if (isFlowChart) {
    specificTaskPrompt = language === 'zh'
      ? `针对“过程流程图”，请**严格按照以下Checklist**进行逐项检查。
         **输出要求**：请只输出结果为【NO】(不符合) 或 【N/A】(无法判断) 的项目作为发现点。如果完全符合【YES】，则不需要列出，除非有特殊备注。
         **发现点格式**："[检查项名称]: [NO/NA] - [详细原因/事实]"
         
         **Checklist**:
         1. **文件标识 (Identification)**：
            - [ ] 是否包含零件号 (Part Number)？
            - [ ] 是否包含零件名称 (Part Name)？
            - [ ] 是否包含项目名称/平台信息？
         2. **版本控制 (Version Control)**：
            - [ ] 是否有版本号 (Revision Level)？
            - [ ] 是否有日期 (Date)？(日期逻辑是否合理?)
         3. **图例说明 (Legend)**：
            - [ ] 是否定义了标准符号（操作、检验、储存、运输）？
            - [ ] 是否定义了特殊特性符号（如 SC/CC, 菱形, 倒三角）？
         4. **全流程覆盖 (End-to-End)**：
            - [ ] 起点是否从“原材料/外购件接收”开始？
            - [ ] 终点是否以“发货/交付”结束？
            - [ ] 外包工序是否明确标出（如有）？
         5. **非增值过程 (Non-Value Added)**：
            - [ ] 运输/移动是否标出？
            - [ ] 储存/暂存区是否标出？
         6. **返工/返修回路 (Rework/Repair Loops) —— VDA 必查项**：
            - [ ] 每一个检验工序后是否有“NG”流向？
            - [ ] 是否画出了具体的返工步骤（不能仅是一个箭头回指）？
            - [ ] 返工后是否**强制回到**检验工序（Re-inspection）？
            - [ ] 是否有明确的“报废 (Scrap)”路径？
         7. **特殊区域标识**：
            - [ ] 是否包含“隔离区 (Quarantine Area)”？
            - [ ] 全尺寸检验 (Layout Inspection) 是否提及？
         8. **步骤编号与描述**：
            - [ ] 步骤编号是否唯一 (OP10, OP20...)？描述是否准确？
         9. **特性传递**：
            - [ ] 特殊特性符号是否已在对应工序中标注？`
      : `For "Process Flow Chart", strictly follow the checklist below.
         **Output Requirement**: Only list items judged as [NO] (Non-compliant) or [N/A] (Cannot Determine). Do not list [YES] items unless noteworthy.
         **Format**: "[Item Name]: [NO/NA] - [Detailed Reason]"

         **Checklist**:
         1. **Identification**: Part Number? Part Name? Project Info?
         2. **Version Control**: Revision Level? Date? (Logical?)
         3. **Legend**: Standard symbols defined? SC/CC symbols defined?
         4. **End-to-End**: Starts with Receiving? Ends with Shipping? Outsourced marked?
         5. **Non-Value Added**: Transport/Movement marked? Storage/WIP marked?
         6. **Rework/Repair Loops (VDA Critical)**:
            - NG flow after every inspection?
            - Specific rework steps shown (not just arrow)?
            - Return to Re-inspection after rework?
            - Scrap path defined?
         7. **Special Areas**: Quarantine Area marked? Layout Inspection mentioned?
         8. **Steps**: Unique IDs (OP10...)? Accurate descriptions?
         9. **Traceability**: SC/CC symbols marked?`;
  } else if (isControlPlan) {
    specificTaskPrompt = language === 'zh'
      ? `针对“控制计划”，你的审核必须非常严谨。**请罗列所有**发现的问题：
         1. **要素完整性**：每一个过程步骤是否都有相应的控制方法？
         2. **控制逻辑**：
            - 针对特殊特性（SC/CC），控制方法（如SPC、全检）是否足够严格？
            - 抽样频率是否合理？（如：关键尺寸一天一检是否风险太大？）
         3. **反应计划**：反应计划是否具体？（不能只是简单的“通知班长”，应包含隔离、追溯等具体动作）。
         4. **量具匹配**：评价测量技术是否适配公差精度？`
      : `For "Control Plan", be EXHAUSTIVE. List ALL findings:
         1. Completeness: Does every step have a control method?
         2. Control Logic: 
            - Are SC/CCs controlled strictly (SPC/100%)?
            - Is Frequency sufficient?
         3. Reaction Plan: Is it specific (e.g., Quarantine/Trace back) rather than generic?
         4. Gauges: Is the measurement technique adequate for the tolerance?`;
  } else if (isICL) {
    specificTaskPrompt = language === 'zh'
      ? `针对“特殊特性清单(ICL)”，请**罗列所有**问题：
         1. **定义**：特性的符号、分类（安全/功能/配合）是否定义准确？
         2. **一致性**：公差范围是否与图纸严格一致？
         3. **完整性**：是否遗漏了图纸上标记的某些关键特性？`
      : `For "ICL", list ALL findings:
         1. Definition: Are symbols and classes defined correctly?
         2. Consistency: Do tolerances match the Drawing exactly?
         3. Completeness: Are any Drawing SCs missing here?`;
  } else if (isPFMEA) {
    specificTaskPrompt = language === 'zh'
      ? `针对“过程失效模式及后果分析(PFMEA)”，你的审核必须非常严谨且全面。请**罗列所有**发现的问题，不要只举例：
         1. **评分逻辑 (S/O/D)**：
            - **严重度(S)**：失效后果严重的项目，S值是否足够高（如影响安全S应为9-10）？
            - **探测度(D)**：如果“现行控制”只是“目视检查”，D值是否被错误地评得很低（应为高分）？
            - **频度(O)**：如果没有防错措施，O值是否过低？
         2. **改善措施**：
            - 对于RPN/AP值高的项目（或S>=8），是否列出了“建议措施”？
            - 建议措施是否有责任人和目标日期？
         3. **因果逻辑**：失效模式 -> 失效后果 -> 失效原因 的逻辑链条是否通顺？原因分析是否具体到工装/参数层面？`
      : `For "PFMEA", be EXHAUSTIVE. List ALL findings:
         1. **Scoring Logic (S/O/D)**:
            - Severity: Is it high (9-10) for safety issues?
            - Detection: Is D too low for "Visual Inspection" (should be high)?
            - Occurrence: Is O too low without error-proofing?
         2. **Improvement Actions**:
            - Do high Risk items (High RPN/S>=8) have "Recommended Actions"?
            - Are owners/dates assigned?
         3. **Causal Logic**: Is the Mode -> Effect -> Cause chain logical? Are causes specific?`;
  } else if (isDimensionCheck) {
    specificTaskPrompt = language === 'zh'
      ? `针对“尺寸检查报告”，请**罗列所有**问题：
         1. **全尺寸验证**：是否覆盖了图纸上的所有尺寸（全尺寸报告）？遗漏了哪些球标？
         2. **判定准确性**：实测值是否在公差范围内？
         3. **超差标识**：超差（OOT）的数值是否已明确标识（如红色/星号）？是否有批准放行的签字？
         4. **数据真实性专家判断**：数据是否存在异常规律（如所有数据完全是中值，可能造假）？`
      : `For "Dimension Check Report", list ALL findings:
         1. Full Layout: Are ALL drawing dims included? Which balloons are missing?
         2. Accuracy: Are actuals within tolerance?
         3. OOT Flags: Are Out-of-Tolerance values flagged? Approved?
         4. Data Integrity: Do data look fake (e.g., all nominal)?`;
  } else if (isMSA) {
    specificTaskPrompt = language === 'zh'
      ? `针对“测量系统分析(MSA)”，请**罗列所有**问题：
         1. **判定标准**：
            - GRR% 是否 < 10%（理想）或 < 30%（可接受）？
            - 分级数 (ndc) 是否 >= 5？
         2. **方法论**：是否使用了正确的分析方法（均值极差法/方差分析法）？
         3. **抽样**：是否包含了至少10个零件、2-3名评价人、2-3次重复测量？`
      : `For "MSA", list ALL findings:
         1. Criteria: Is %GRR < 10% (or <30%)? Is ndc >= 5?
         2. Methodology: Is ANOVA/Xbar-R used correctly?
         3. Sampling: Are there 10 parts, 2-3 appraisers, 2-3 trials?`;
  } else if (isSPC) {
    specificTaskPrompt = language === 'zh'
      ? `针对“初始过程能力研究(SPC)”，请**罗列所有**问题：
         1. **判定标准**：Ppk/Cpk 是否 > 1.67（新项目）或 > 1.33（稳定过程）？
         2. **稳定性**：控制图（Xbar-R）是否有判异准则触发（如点出界、趋势倾向）？
         3. **正态性**：直方图是否显示正态分布？
         4. **抽样量**：子组数量是否足够（通常要求25组以上）？`
      : `For "SPC", list ALL findings:
         1. Criteria: Is Ppk/Cpk > 1.67 or 1.33?
         2. Stability: Are there control chart violations (trends/outliers)?
         3. Normality: Is distribution normal?
         4. Sampling: Are there >25 subgroups?`;
  } else if (isDFMEA) {
    specificTaskPrompt = language === 'zh'
      ? `针对“设计失效模式(DFMEA)”，请**罗列所有**问题：
         1. **评分逻辑**：S/O/D评分是否客观？
         2. **风险控制**：高严重度项目是否有特殊特性标识？
         3. **完整性**：是否考虑了制造可行性(DFM)和装配可行性(DFA)相关的失效模式？`
      : `For "DFMEA", list ALL findings:
         1. Scoring: Are S/O/D subjective?
         2. Risk: Are high Severity items marked as SC?
         3. Completeness: Are DFM/DFA failure modes considered?`;
  }

  const prompt = `
    You are an expert Automotive Supplier Quality Engineer (SQE) with 20 years of experience auditing PPAP packages.
    
    Your task is to audit the uploaded document: "${itemName}".
    
    **CRITICAL CONTEXT**: 
    - Today's Date is: ${today}.
    - Any date significantly in the future relative to ${today} should be flagged as invalid. 
    - Any date reasonably in the past is valid.
    
    **CRITICAL INSTRUCTION**: You must provide a **COMPREHENSIVE AND EXHAUSTIVE LIST** of every single issue found. 
    - Do NOT summarize multiple issues into one. 
    - Do NOT just give examples (e.g., do not say "some RPNs are wrong", instead list "Item #3, #5, and #8 have incorrect RPN logic").
    - If there are 10 errors, list all 10 errors individually.
    
    ${langInstruction}
    ${exemptionPrompt}
    ${focusRulesPrompt}
    ${specificTaskPrompt}

    Please perform a rigorous visual and content inspection based on automotive standards (AIAG/VDA).
    Analyze the image for Correctness, Completeness, Validity, and Logic.
    
    Provide the output in JSON format strictly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              enum: ["APPROVED", "REJECTED", "WARNING"],
              description: "The overall audit decision (Always in English)."
            },
            summary: {
              type: Type.STRING,
              description: language === 'zh' ? "简要的总结 (中文)" : "A concise executive summary of the document (1-2 sentences)."
            },
            findings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: language === 'zh' ? "具体发现问题的列表 (中文)" : "List of specific findings. Map findings strictly to the requested categories."
            },
            recommendation: {
              type: Type.STRING,
              description: language === 'zh' ? "给SQE的可执行建议 (中文)" : "Actionable advice for the SQE."
            }
          },
          required: ["status", "summary", "findings", "recommendation"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      
      let statusEnum = AuditStatus.WARNING;
      if (result.status === 'APPROVED') statusEnum = AuditStatus.APPROVED;
      if (result.status === 'REJECTED') statusEnum = AuditStatus.REJECTED;

      return {
        status: statusEnum,
        summary: result.summary,
        findings: result.findings,
        recommendation: result.recommendation
      };
    }
    
    throw new Error("No response text generated");
  } catch (error) {
    console.error("AI Audit Error:", error);
    return {
      status: AuditStatus.WARNING,
      summary: language === 'zh' ? "AI分析无法处理该文档结构。" : "AI Analysis failed to process the document structure.",
      findings: [
        language === 'zh' ? "系统错误: 无法完成视觉分析。" : "System Error: Unable to complete visual analysis.", 
        String(error)
      ],
      recommendation: language === 'zh' ? "需要人工审核。" : "Manual review required."
    };
  }
};

export const runConsistencyCheck = async (
  ruleId: string,
  documents: { name: string; data: string; mimeType: string }[],
  language: Language
): Promise<ConsistencyResult> => {
  const ai = getAiClient();

  const langInstruction = language === 'zh' 
  ? "OUTPUT LANGUAGE REQUIREMENT: The values for 'analysis' and 'discrepancies' fields in the JSON response MUST be in Simplified Chinese (简体中文). The 'status' field MUST be in English (PASS, FAIL, WARNING)."
  : "OUTPUT LANGUAGE REQUIREMENT: Provide all output in English.";

  // Define specific prompts based on the Rule ID
  let specificRuleInstructions = "";

  if (ruleId === 'header_match') {
    specificRuleInstructions = language === 'zh' ? `
      **关联检查目标：封面 vs 图纸 (基础信息一致性)**
      **指令：罗列所有不一致点。**
      1. 提取“封面(Cover Sheet)”上的零件名称、零件号、版本号、供应商名称。
      2. 提取“图纸(Design Release)”标题栏中的零件名称、零件号、版本号、供应商名称。
      3. **判定标准**：上述信息必须完全一致（忽略大小写和空格）。如果有任何不匹配（特别是版本号），必须报出。
    ` : `
      **Correlation Goal: Cover Sheet vs Drawing (Basic Info)**
      **Instruction: List ALL mismatches.**
      1. Extract Part Name, Part Number, Revision, Supplier Name from Cover Sheet.
      2. Extract Part Name, Part Number, Revision, Supplier Name from Drawing Title Block.
      3. **Criteria**: Must match exactly. Report any mismatch, especially Revision Level.
    `;
  } else if (ruleId === 'dim_vs_drawing') {
    specificRuleInstructions = language === 'zh' ? `
      **关联检查目标：尺寸报告 vs 图纸 (尺寸验证)**
      **指令：罗列所有未涵盖或超差的尺寸。**
      1. 识别图纸上的球标编号（Balloon Numbers）或关键尺寸标注。
      2. 检查尺寸报告中是否包含这些对应的编号或尺寸规格。
      3. **判定标准**：
         - 报告是否遗漏了图纸上的尺寸？(列出遗漏的球标号)
         - 报告中的实测值是否在图纸要求的公差范围内？(列出所有超差项)
         - 如果有超差（Out of Tolerance），报告中是否已明确标识（如加粗、标红或备注）？
    ` : `
      **Correlation Goal: Dimension Report vs Drawing**
      **Instruction: List ALL missing or OOT dimensions.**
      1. Identify Balloon Numbers/Key Dimensions on the Drawing.
      2. Check if these IDs/Specs appear in the Dimension Report.
      3. **Criteria**:
         - List all missing balloons.
         - List all OOT (Out-of-Tolerance) values.
         - Are OOT items clearly flagged?
    `;
  } else if (ruleId === 'sc_traceability') {
    specificRuleInstructions = language === 'zh' ? `
      **关联检查目标：特殊特性“金线”追溯 (Golden Thread)**
      **指令：请严格按照以下4个维度进行深度审核，并将所有的发现项目都陈列出来，不要遗漏任何一个断层。**
      
      1. **传递完整性 (Transmission)**：
         - 逐一检查每个特殊特性(SC/CC/关键符号)。
         - 路径：图纸(7) -> ICL清单(15) -> DFMEA(11) -> PFMEA(12) -> 控制计划(14)。
         - 错误示例：“图纸上球标#5是SC，但在PFMEA中未标记SC”。请罗列所有此类断层。

      2. **参数一致性 (Data Consistency)**：
         - 提取并比对具体的**尺寸数值、公差要求、技术指标**。
         - 确保 图纸(7) 中的规格值与 ICL(15)、DFMEA(11)、PFMEA(12) 及 控制计划(14) 中的描述完全一致。
         - 警惕单位错误或公差范围被擅自放宽的情况。

      3. **专家深度研判 (Expert Judgment)**：
         - 从SQE专家角度审核：
         - 控制计划中针对该特性的控制方法（如量具选择、抽样频率、SPC/全检）是否足以控制DFMEA/PFMEA中识别的风险？
         - 失效模式分析是否逻辑通顺？

      4. **其它发现 (Other Findings)**：
         - 任何上述未涵盖的异常。
    ` : `
      **Correlation Goal: Special Characteristics "Golden Thread"**
      **Instruction: List ALL deviations across 4 dimensions. Be exhaustive.**

      1. **Transmission Integrity**:
         - Check flow of EVERY Special Characteristic (SC/CC).
         - Path: Drawing -> ICL -> DFMEA -> PFMEA -> CP.
         - List every instance where a symbol is dropped.

      2. **Data Consistency**:
         - Compare specific **dimensions, tolerances, and technical specs**.
         - Report ANY mismatch in values/units/tolerances between documents.

      3. **Expert Judgment**:
         - Are the control methods in the Control Plan (Gage type, Frequency, SPC vs 100%) adequate for the risks identified in FMEA?
         - Is the failure analysis logical?

      4. **Other Findings**:
         - Any other inconsistencies or risks.
    `;
  } else if (ruleId === 'process_chain') {
    specificRuleInstructions = language === 'zh' ? `
      **关联检查目标：过程链一致性 (Flow Chart -> PFMEA -> Control Plan)**
      **指令：罗列所有不匹配的工序。**
      1. 提取三个文档中的工序编号（Op 10, Op 20...）和工序名称。
      2. **判定标准**：
         - 三个文档的工序顺序必须完全一致。
         - 列出所有“流程图有但PFMEA没有”或“描述不一致”的工序。
    ` : `
      **Correlation Goal: Process Chain Alignment (Flow Chart -> PFMEA -> Control Plan)**
      **Instruction: List ALL mismatched steps.**
      1. Extract Op Numbers (Op 10, Op 20...) and Names from all 3 docs.
      2. **Criteria**:
         - Sequence must match exactly.
         - List all missing or misnamed steps across the 3 docs.
    `;
  } else if (ruleId === 'qa_consistency') {
    specificRuleInstructions = language === 'zh' ? `
      **关联检查目标：质量系统一致性 (Control Plan vs MSA vs SPC)**
      **指令：罗列所有缺失的证据。**
      1. **MSA检查**：提取控制计划中使用的量具名称。检查上传的MSA报告是否针对该量具进行了GRR分析？
      2. **SPC检查**：提取控制计划中标记为需要SPC控制的特性（或特殊特性）。检查上传的SPC报告是否针对该特性生成了能力指数（Cpk/Ppk）？
      **判定标准**：列出所有在CP中要求但缺失MSA或SPC报告的项目。
    ` : `
      **Correlation Goal: QA System Alignment (Control Plan vs MSA vs SPC)**
      **Instruction: List ALL missing evidence.**
      1. **MSA Check**: Extract Gage Names from Control Plan. Does the MSA report cover these gages?
      2. **SPC Check**: Extract features marked for SPC in Control Plan. Does the SPC report cover these features?
      **Criteria**: List all items in CP missing corresponding MSA or SPC data.
    `;
  } else {
    // Fallback or generic logic
    specificRuleInstructions = `
      **General Correlation Check**
      Compare the provided documents for logical consistency, data integrity, and matching information. List all discrepancies found.
    `;
  }

  const prompt = `
    You are a Lead Automotive SQE performing a Deep Dive Correlation Audit on a PPAP package.
    
    Task: Validate the consistency between the provided documents based on the specific rule below.

    ${langInstruction}
    
    ${specificRuleInstructions}
    
    Documents Provided:
    ${documents.map((d, i) => `${i + 1}. ${d.name}`).join('\n')}
    
    Output strictly in JSON.
  `;

  const parts: any[] = [{ text: prompt }];
  
  documents.forEach(doc => {
    parts.push({
      inlineData: {
        mimeType: doc.mimeType,
        data: doc.data.replace(/^data:.+;base64,/, '')
      }
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['PASS', 'FAIL', 'WARNING'] },
            score: { type: Type.INTEGER, description: "Consistency score from 0 to 100" },
            analysis: { 
                type: Type.STRING, 
                description: language === 'zh' ? "详细的关联分析解释 (中文)" : "Detailed explanation of the correlation analysis." 
            },
            discrepancies: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: language === 'zh' ? "具体差异点列表 (中文)" : "List of specific mismatches found." 
            }
          },
          required: ["status", "score", "analysis", "discrepancies"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return {
        ruleId: ruleId,
        status: result.status,
        score: result.score,
        analysis: result.analysis,
        discrepancies: result.discrepancies,
        lastRun: new Date()
      };
    }
    throw new Error("Empty response from Consistency Check");
  } catch (error) {
    console.error("Consistency Check Error:", error);
    return {
      ruleId: ruleId,
      status: 'WARNING',
      score: 0,
      analysis: language === 'zh' ? "由于AI服务错误，无法执行一致性检查。" : "Failed to perform consistency check due to AI service error.",
      discrepancies: [String(error)],
      lastRun: new Date()
    };
  }
};
