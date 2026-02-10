import { PpapItem, AuditStatus } from './types';

export const PPAP_MASTER_LIST: Omit<PpapItem, 'status'>[] = [
  { id: 0, name: "Cover sheet for PPA report", name_zh: "PPA报告封面 (Cover Sheet)", requiredForLevels: [1, 2, 3, 4, 5] },
  { id: 1, name: "Dimension Check", name_zh: "尺寸检查报告 (Dimension Check)", requiredForLevels: [2, 3, 4, 5] },
  { id: 2, name: "Test Plan", name_zh: "试验计划 (Test Plan)", requiredForLevels: [2, 3, 4, 5] },
  { id: 3, name: "Functional test report", name_zh: "功能试验报告 (Functional Test)", requiredForLevels: [2, 3, 4, 5] },
  { id: 4, name: "Raw Material Check", name_zh: "原材料证明 (Raw Material)", requiredForLevels: [3, 4, 5] },
  { id: 5, name: "Appearance Check", name_zh: "外观检查报告 (Appearance)", requiredForLevels: [1, 2, 3, 4, 5] },
  { id: 6, name: "Technical Specifications", name_zh: "技术规范 (Tech Specs)", requiredForLevels: [3, 5] },
  { id: 7, name: "Design Release", name_zh: "设计发布/图纸 (Design Release)", requiredForLevels: [3, 5] },
  { id: 8, name: "Compliance with legal requirements", name_zh: "法规符合性证明 (Legal Req)", requiredForLevels: [3, 5] },
  { id: 9, name: "Material declaration (IMDS / N2580)", name_zh: "物质成分申报 (IMDS)", requiredForLevels: [3, 5] },
  { id: 11, name: "Design FMEA", name_zh: "设计失效模式分析 (DFMEA)", requiredForLevels: [3, 5] },
  { id: 12, name: "Process FMEA", name_zh: "过程失效模式分析 (PFMEA)", requiredForLevels: [3, 5] },
  { id: 13, name: "Process Flow Chart", name_zh: "过程流程图 (Flow Chart)", requiredForLevels: [3, 5] },
  { id: 14, name: "Control Plan", name_zh: "控制计划 (Control Plan)", requiredForLevels: [3, 5] },
  { id: 15, name: "Important Characteristics List (ICL)", name_zh: "特殊特性清单 (ICL)", requiredForLevels: [3, 5] },
  { id: 16, name: "Inspection and Test Equipment List", name_zh: "检具和试验设备清单", requiredForLevels: [3, 5] },
  { id: 17, name: "Capability Study Process (Cpk/Ppk)", name_zh: "初始过程能力研究 (Cpk/Ppk)", requiredForLevels: [3, 5] },
  { id: 18, name: "MSA (Measurement System Analysis)", name_zh: "测量系统分析 (MSA)", requiredForLevels: [3, 5] },
  { id: 19, name: "Tooling List", name_zh: "工装清单 (Tooling List)", requiredForLevels: [3, 5] },
  { id: 20, name: "BOM (Bill of Materials)", name_zh: "物料清单 (BOM)", requiredForLevels: [3, 5] },
  { id: 21, name: "Self assessment on product and process", name_zh: "产品和过程自评", requiredForLevels: [2, 3, 5] },
  { id: 22, name: "Approved PDS (Packaging data Sheet)", name_zh: "批准的包装规范 (PDS)", requiredForLevels: [2, 3, 5] },
  { id: 23, name: "TMM (Technical Material Master)", name_zh: "技术材料主数据 (TMM)", requiredForLevels: [3, 5] },
];

export const INITIAL_ITEMS = (level: number): PpapItem[] => {
  return PPAP_MASTER_LIST.map(item => ({
    ...item,
    status: AuditStatus.PENDING,
  })).filter(item => item.requiredForLevels.includes(level));
};
