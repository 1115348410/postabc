# 内置变量系统实现计划

**设计文档**: `docs/superpowers/specs/2026-03-13-builtin-variables-design.md`
**创建日期**: 2026-03-13
**预计工时**: 4-6 小时

---

## 概述

本计划将实现内置变量系统，包括：
- 45 个内置变量（日期时间、随机数、Mock 数据）
- 帮助抽屉组件
- 环境变量命名校验
- 变量缓存机制

---

## Phase 1: 基础架构 (30分钟)

### Task 1.1: 创建目录结构和类型定义

**文件**: `src/utils/variables/types.ts` (新建)

```typescript
// src/utils/variables/types.ts
export interface BuiltinVariable {
  name: string;
  label: string;
  description: string;
  category: 'datetime' | 'random' | 'mock';
  hasParams?: boolean;
  paramsFormat?: string;
  paramsExample?: string;
  generate: (params?: string, context?: VariableContext) => string;
}

export interface VariableCategory {
  id: 'datetime' | 'random' | 'mock';
  label: string;
  icon: string;
  variables: BuiltinVariable[];
}

export interface VariableContext {
  cache: Map<string, string>;
  timestamp: number;
}

export function createVariableContext(): VariableContext {
  return {
    cache: new Map<string, string>(),
    timestamp: Date.now(),
  };
}
```

**验收标准**:
- [ ] 类型定义完整
- [ ] TypeScript 编译通过

---

### Task 1.2: 实现变量名校验函数

**文件**: `src/utils/variables/validation.ts` (新建)

```typescript
// src/utils/variables/validation.ts
export const RESERVED_PREFIXES = ['uv.'];

export function validateVariableName(name: string): { valid: boolean; error?: string } {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: '变量名不能为空' };
  }

  for (const prefix of RESERVED_PREFIXES {
    if (trimmedName.toLowerCase().startsWith(prefix.toLowerCase())) {
      return {
        valid: false,
        error: `变量名不能以 "${prefix}" 开头，此前缀保留给脚本动态变量使用`,
      };
    }
  }

  return { valid: true };
}
```

**验收标准**:
- [ ] `uv.xxx` 被正确拒绝
- [ ] 正常变量名通过校验

---

### Task 1.3: 实现 Mock 数据源

**文件**: `src/utils/variables/mock-data.ts` (新建)

包含以下数据：
- 中文姓氏列表 (约100个常见姓氏)
- 中文名字列表 (约100个常用字)
- 英文名列表
- 城市列表
- 省份列表
- 公司前缀词
- 词语列表

**验收标准**:
- [ ] 数据完整，能生成有效的 Mock 数据

---

## Phase 2: 变量实现 (90分钟)

### Task 2.1: 实现日期时间变量

**文件**: `src/utils/variables/datetime.ts` (新建)

**变量列表** (17个):
- `$timestamp`, `$timestampMs`, `$date`, `$datetime`, `$datetimeIso`, `$datetimeRfc`
- `$datetimeLocal`, `$time`, `$year`, `$month`, `$day`, `$hour`, `$minute`, `$second`
- `$weekday`, `$weekdayName`, `$unix`

**关键实现**:
```typescript
export function getDatetimeVariables(context: VariableContext): BuiltinVariable[] {
  const now = new Date(context.timestamp);

  return [
    {
      name: '$timestamp',
      label: '当前时间戳（秒）',
      description: '当前时间戳（秒）',
      category: 'datetime',
      generate: () => Math.floor(context.timestamp / 1000).toString(),
    },
    // ... 其他变量
  ];
}
```

**验收标准**:
- [ ] 所有 17 个日期时间变量正确生成
- [ ] 同一请求内时间戳一致（使用 context.timestamp）
- [ ] `$weekdayName` 返回中文星期几

---

### Task 2.2: 实现随机数变量

**文件**: `src/utils/variables/random.ts` (新建)

**变量列表** (15个):
- `$guid`, `$uuid`, `$randomUuid` (别名)
- `$randomInt`, `$randomInt:min:max`
- `$randomFloat`, `$randomFloat:min:max`
- `$randomString`, `$randomString:length`
- `$randomHex`, `$randomColor`, `$randomBoolean`, `$randomIp`, `$randomIpv6`, `$localIp`

**关键实现**:
```typescript
function generateIPv6(): string {
  const parts = [];
  for (let i = 0; i < 8; i++) {
    parts.push(Math.floor(Math.random() * 65536).toString(16).padStart(4, '0'));
  }
  return parts.join(':');
}
```

**验收标准**:
- [ ] 所有 15 个随机变量正确生成
- [ ] 带参数的变量正确解析参数
- [ ] 无效参数时返回原始占位符
- [ ] UUID 别名正常工作

---

### Task 2.3: 实现 Mock 数据变量

**文件**: `src/utils/variables/mock.ts` (新建)

**变量列表** (13个):
- `$mock.name`, `$mock.nameEn`, `$mock.firstName`, `$mock.lastName`
- `$mock.email`, `$mock.phone`, `$mock.idCard`
- `$mock.address`, `$mock.city`, `$mock.province`
- `$mock.company`, `$mock.word`, `$mock.sentence`

**关键实现 - 身份证生成**:
```typescript
function generateIdCard(): string {
  // 1. 随机地区码 (6位)
  const areaCode = mockData.areaCodes[Math.floor(Math.random() * mockData.areaCodes.length)];

  // 2. 随机出生日期 (8位)
  const year = 1950 + Math.floor(Math.random() * 60);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const birthDate = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;

  // 3. 随机顺序码 (3位)
  const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  // 4. 计算校验码
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const base = areaCode + birthDate + sequence;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(base[i]) * weights[i];
  }
  const checkCode = checkCodes[sum % 11];

  return base + checkCode;
}
```

**验收标准**:
- [ ] 所有 13 个 Mock 变量正确生成
- [ ] 身份证号格式正确（18位，校验码有效）
- [ ] 手机号符合中国手机号格式

---

### Task 2.4: 实现统一替换函数

**文件**: `src/utils/variables/index.ts` (新建)

**核心逻辑**:
```typescript
export function replaceVariables(
  text: string,
  env: Record<string, any>,
  context?: VariableContext
): string {
  if (!text || typeof text !== 'string') return text;

  const ctx = context || createVariableContext();

  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const lowerKey = trimmedKey.toLowerCase();

    // 1. 检查缓存
    if (ctx.cache.has(lowerKey)) {
      return ctx.cache.get(lowerKey)!;
    }

    // 2. 尝试内置变量
    const builtinValue = generateBuiltinVariable(trimmedKey, ctx);
    if (builtinValue !== null) {
      ctx.cache.set(lowerKey, builtinValue);
      return builtinValue;
    }

    // 3. 尝试环境变量
    if (env && env[trimmedKey] !== undefined) {
      const value = String(env[trimmedKey]);
      ctx.cache.set(lowerKey, value);
      return value;
    }

    // 4. 未找到，保留原样
    return match;
  });
}
```

**验收标准**:
- [ ] 变量替换顺序正确（内置变量 → 环境变量）
- [ ] 缓存机制正常工作
- [ ] 大小写不敏感匹配

---

## Phase 3: 兼容性处理 (15分钟)

### Task 3.1: 更新现有 variable.ts

**文件**: `src/utils/variable.ts` (修改)

**修改内容**:
```typescript
// 保留现有导出，添加新导出
export {
  replaceVariables,
  generateBuiltinVariable,
  extractVariables,
  getRequestVariables,
  getBuiltinVariablesList,
  createVariableContext,
  validateVariableName,
} from './variables';

export type { BuiltinVariable, VariableCategory, VariableContext } from './variables';
```

**验收标准**:
- [ ] 现有代码无需修改
- [ ] 所有导出正常工作

---

## Phase 4: UI组件 (90分钟)

### Task 4.1: 实现帮助抽屉组件

**文件**: `src/components/BuiltinVariablesDrawer.tsx` (新建)

**组件结构**:
```tsx
interface BuiltinVariablesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BuiltinVariablesDrawer({ isOpen, onClose }: BuiltinVariablesDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['datetime', 'random', 'mock'])
  );
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // 过滤变量
  const filteredCategories = useMemo(() => {
    return getAllCategories().map(category => ({
      ...category,
      variables: category.variables.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    })).filter(c => c.variables.length > 0);
  }, [searchTerm]);

  // 复制处理
  const handleCopy = async (varName: string) => {
    await navigator.clipboard.writeText(`{{${varName}}}`);
    setCopiedVariable(varName);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  // ...
}
```

**样式**:
```css
.drawer {
  position: fixed;
  right: 0;
  top: 0;
  width: 50%;
  height: 100vh;
  z-index: 100;
  background: #1f2937;
  border-left: 1px solid #374151;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
}
```

**验收标准**:
- [ ] 抽屉正确显示/隐藏
- [ ] 搜索功能正常
- [ ] 分类折叠/展开正常
- [ ] 复制功能正常，显示 Toast 提示

---

### Task 4.2: 修改 DevToolsPanel.tsx

**文件**: `src/components/DevToolsPanel.tsx` (修改)

**修改内容**:

1. 添加状态:
```typescript
const [showBuiltinVarsDrawer, setShowBuiltinVarsDrawer] = useState(false);
```

2. 添加帮助图标按钮 (在顶部标题栏右侧):
```tsx
<button
  onClick={() => setShowBuiltinVarsDrawer(!showBuiltinVarsDrawer)}
  className={`p-2 transition-colors ${
    showBuiltinVarsDrawer
      ? 'text-primary-400 bg-primary-900/20'
      : 'text-gray-400 hover:text-white'
  }`}
  title="内置变量参考"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
</button>
```

3. 添加抽屉组件:
```tsx
<BuiltinVariablesDrawer
  isOpen={showBuiltinVarsDrawer}
  onClose={() => setShowBuiltinVarsDrawer(false)}
/>
```

**验收标准**:
- [ ] 帮助图标显示正确
- [ ] 点击图标切换抽屉显示/隐藏
- [ ] 图标激活状态正确

---

### Task 4.3: 修改 EnvironmentManager.tsx

**文件**: `src/components/EnvironmentManager.tsx` (修改)

**修改内容**:

1. 导入校验函数:
```typescript
import { validateVariableName } from '../utils/variables/validation';
```

2. 添加错误状态:
```typescript
const [validationError, setValidationError] = useState<string | null>(null);
```

3. 修改 `handleAddVariable`:
```typescript
const handleAddVariable = async () => {
  if (!newKey.trim()) return;

  // 校验变量名
  const validation = validateVariableName(newKey.trim());
  if (!validation.valid) {
    setValidationError(validation.error || '变量名无效');
    return;
  }
  setValidationError(null);

  // ... 原有逻辑
};
```

4. 修改 `handleUpdateVariable`:
```typescript
const handleUpdateVariable = async (variable, key, value) => {
  // 校验变量名
  const validation = validateVariableName(key.trim());
  if (!validation.valid) {
    // 显示错误提示
    return;
  }

  // ... 原有逻辑
};
```

5. 添加错误提示 UI:
```tsx
{validationError && (
  <div className="px-6 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
    <p className="text-xs text-yellow-600 dark:text-yellow-400">
      ⚠️ {validationError}
    </p>
  </div>
)}
```

**验收标准**:
- [ ] `uv.` 前缀变量被正确拒绝
- [ ] 显示错误提示
- [ ] 正常变量名可以正常添加

---

## Phase 5: 测试 (60分钟)

### Task 5.1: 单元测试 - 变量生成

**文件**: `src/utils/variables/__tests__/variables.test.ts` (新建)

**测试用例**:
- [ ] 日期时间变量生成正确
- [ ] 随机变量生成正确
- [ ] Mock 变量生成正确
- [ ] 带参数变量解析正确
- [ ] 无效参数返回原始占位符

### Task 5.2: 单元测试 - 变量替换

**文件**: `src/utils/variables/__tests__/replace.test.ts` (新建)

**测试用例**:
- [ ] 简单变量替换
- [ ] 多变量替换
- [ ] 缓存机制验证
- [ ] 环境变量优先级

### Task 5.3: 单元测试 - 校验函数

**文件**: `src/utils/variables/__tests__/validation.test.ts` (新建)

**测试用例**:
- [ ] `uv.` 前缀被拒绝
- [ ] 正常变量名通过
- [ ] 空变量名被拒绝

---

## 执行顺序

```
Phase 1 (基础架构)
├── Task 1.1: types.ts
├── Task 1.2: validation.ts
└── Task 1.3: mock-data.ts

Phase 2 (变量实现)
├── Task 2.1: datetime.ts
├── Task 2.2: random.ts
├── Task 2.3: mock.ts
└── Task 2.4: index.ts (替换函数)

Phase 3 (兼容性)
└── Task 3.1: 更新 variable.ts

Phase 4 (UI组件)
├── Task 4.1: BuiltinVariablesDrawer.tsx
├── Task 4.2: 修改 DevToolsPanel.tsx
└── Task 4.3: 修改 EnvironmentManager.tsx

Phase 5 (测试)
├── Task 5.1: 变量生成测试
├── Task 5.2: 变量替换测试
└── Task 5.3: 校验函数测试
```

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 身份证生成算法错误 | 参考 GB 11643-1999 标准，添加单元测试 |
| 缓存机制影响功能 | 缓存仅在单次替换内有效，不跨请求 |
| 向后兼容性问题 | 保留所有现有变量，添加别名映射 |

---

## 完成标准

- [ ] 所有 45 个变量正确生成
- [ ] 帮助抽屉组件正常工作
- [ ] 环境变量校验正常
- [ ] 所有单元测试通过
- [ ] TypeScript 编译无错误
- [ ] 现有功能不受影响
