# 内置变量系统设计文档

**日期**: 2026-03-13
**状态**: 已批准
**作者**: Claude + 用户

---

## 1. 概述

为 PostABC 添加内置变量系统，提供时间戳、UUID、随机数、Mock 数据等动态变量，方便用户在请求参数中使用。

### 1.1 目标

- 扩展内置变量至 45 个，覆盖日期时间、随机数、Mock 数据三类
- 提供可视化的变量参考抽屉，方便用户查阅
- 禁止用户在环境变量中使用保留前缀 `uv.`
- 保持与现有变量的完全向后兼容

### 1.2 范围

- 新增变量模块化定义
- 新增帮助抽屉组件
- 环境变量命名校验
- 变量替换逻辑重构

### 1.3 使用格式说明

**重要**: 所有内置变量在实际使用时，必须用 `{{}}` 包裹。

| 变量标识 | 使用示例 | 说明 |
|----------|----------|------|
| `$timestamp` | `{{$timestamp}}` | 当前时间戳（秒） |
| `$guid` | `{{$guid}}` | UUID v4 |
| `$mock.name` | `{{$mock.name}}` | 随机中文姓名 |

带参数的变量：

| 变量标识 | 使用示例 | 说明 |
|----------|----------|------|
| `$randomInt:min:max` | `{{$randomInt:1:100}}` | 1-100 范围随机整数 |
| `$randomString:length` | `{{$randomString:16}}` | 16 位随机字符串 |

---

## 2. 变量命名约定

### 2.1 格式规则

- 所有内置变量以 `$` 开头
- **支持大小写不敏感匹配**
- 推荐使用驼峰命名，但小写命名完全兼容

### 2.2 等效写法示例

以下写法均等效：

| 驼峰命名 | 小写命名 | 全大写 |
|----------|----------|--------|
| `{{$timestamp}}` | `{{$timestamp}}` / `{{$TIMESTAMP}}` | `{{$TIMESTAMP}}` |
| `{{$randomInt}}` | `{{$randomint}}` | `{{$RANDOMINT}}` |
| `{{$randomString:16}}` | `{{$randomstring:16}}` | `{{$RANDOMSTRING:16}}` |

### 2.3 实现原则

```typescript
// 变量名匹配时转换为小写
const lowerName = name.toLowerCase().trim();
```

---

## 3. 依赖与技术选型

### 3.1 Mock 数据生成

- **选型**: 自实现中文 Mock 数据生成器
- **原因**: 避免引入大型第三方库，保持扩展体积小
- **数据源**: 内置中文姓名库、城市列表、省份列表等

### 3.2 日期处理

- **选型**: 原生 `Date` 对象 + 自定义格式化函数
- **原因**: 避免引入 moment.js/dayjs 等大型库

### 3.3 UUID 生成

- **选型**: 使用现有 `crypto.randomUUID()` 或自实现 UUID v4
- **原因**: 浏览器原生支持，无需额外依赖

---

## 4. 文件结构

```
src/
├── utils/
│   ├── variable.ts              # 保留，向后兼容导出
│   └── variables/               # 新建目录
│       ├── index.ts             # 统一导出 + replaceVariables 函数
│       ├── datetime.ts          # 日期时间类变量
│       ├── random.ts            # 随机数/字符串变量
│       ├── mock.ts              # Mock 数据变量
│       ├── mock-data.ts         # 中文 Mock 数据源
│       ├── types.ts             # 变量定义类型
│       └── validation.ts        # 变量名校验
│
├── components/
│   ├── DevToolsPanel.tsx        # 修改：添加帮助图标按钮
│   └── BuiltinVariablesDrawer.tsx  # 新建：内置变量帮助抽屉
│
└── components/EnvironmentManager.tsx  # 修改：添加 uv. 前缀校验
```

---

## 5. 内置变量列表

### 5.1 日期时间类 (17个)

| 变量标识 | 使用示例 | 描述 | 示例值 |
|----------|----------|------|--------|
| `$timestamp` | `{{$timestamp}}` | 当前时间戳（秒） | `1709827200` |
| `$timestampMs` | `{{$timestampMs}}` | 当前时间戳（毫秒） | `1709827200000` |
| `$date` | `{{$date}}` | 当前日期 (YYYY-MM-DD) | `2024-03-07` |
| `$datetime` | `{{$datetime}}` | 当前日期时间 | `2024-03-07T12:00:00.000Z` |
| `$datetimeIso` | `{{$datetimeIso}}` | ISO格式日期时间 | `2024-03-07T12:00:00.000Z` |
| `$datetimeRfc` | `{{$datetimeRfc}}` | RFC格式日期时间 | `Thu, 07 Mar 2024 12:00:00 GMT` |
| `$datetimeLocal` | `{{$datetimeLocal}}` | 本地日期时间 | `2024-03-07 12:00:00` |
| `$time` | `{{$time}}` | 当前时间 (HH:mm:ss) | `12:00:00` |
| `$year` | `{{$year}}` | 当前年份 | `2024` |
| `$month` | `{{$month}}` | 当前月份 (01-12) | `03` |
| `$day` | `{{$day}}` | 当前日期 (01-31) | `07` |
| `$hour` | `{{$hour}}` | 当前小时 (00-23) | `12` |
| `$minute` | `{{$minute}}` | 当前分钟 (00-59) | `00` |
| `$second` | `{{$second}}` | 当前秒 (00-59) | `00` |
| `$weekday` | `{{$weekday}}` | 星期几 (0-6, 0=周日) | `4` |
| `$weekdayName` | `{{$weekdayName}}` | 星期几名称（中文） | `星期四` |
| `$unix` | `{{$unix}}` | Unix时间戳（同$timestamp） | `1709827200` |

**时区说明**：

| 变量 | 时区 | 说明 |
|------|------|------|
| `$datetime`, `$datetimeIso`, `$datetimeRfc` | UTC | 使用 `toISOString()` / `toUTCString()` |
| `$datetimeLocal`, `$time` | 本地时区 | 使用本地时区格式化 |
| `$year`, `$month`, `$day`, `$hour`, `$minute`, `$second`, `$weekday`, `$weekdayName` | 本地时区 | 使用本地时间方法 |

### 5.2 随机数类 (15个)

| 变量标识 | 使用示例 | 描述 | 示例值 |
|----------|----------|------|--------|
| `$guid` | `{{$guid}}` | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `$uuid` | `{{$uuid}}` | UUID v4（$guid别名） | `550e8400-e29b-41d4-a716-446655440000` |
| `$randomUuid` | `{{$randomUuid}}` | UUID v4（$guid别名） | `550e8400-e29b-41d4-a716-446655440000` |
| `$randomInt` | `{{$randomInt}}` | 随机整数 (0-1000) | `42` |
| `$randomInt:min:max` | `{{$randomInt:1:100}}` | 指定范围随机整数 | `50` |
| `$randomFloat` | `{{$randomFloat}}` | 随机浮点数 (0-1, 6位精度) | `0.123456` |
| `$randomFloat:min:max` | `{{$randomFloat:1.5:10.5}}` | 指定范围随机浮点数 (6位精度) | `5.500000` |
| `$randomString` | `{{$randomString}}` | 随机字符串 (10位, A-Za-z0-9) | `aBc123XyZz` |
| `$randomString:length` | `{{$randomString:16}}` | 指定长度随机字符串 (A-Za-z0-9) | `aBc123XyZzAbC` |
| `$randomHex` | `{{$randomHex}}` | 随机十六进制字符串 | `a3f2c1` |
| `$randomColor` | `{{$randomColor}}` | 随机颜色值 | `#FF5500` |
| `$randomBoolean` | `{{$randomBoolean}}` | 随机布尔值（字符串 "true" 或 "false"） | `true` |
| `$randomIp` | `{{$randomIp}}` | 随机IPv4地址 | `192.168.1.100` |
| `$randomIpv6` | `{{$randomIpv6}}` | 随机IPv6地址 | `2001:db8:85a3:0:0:8a2e:370:7334` |
| `$localIp` | `{{$localIp}}` | 本地IP地址 | `127.0.0.1` |

**注**:
- `$guid`、`$uuid`、`$randomUuid` 为同一变量的不同别名
- `$localIp` 在浏览器环境下无法获取真实本地IP，固定返回 `127.0.0.1`

### 5.3 Mock数据类 (13个)

| 变量标识 | 使用示例 | 描述 | 示例值 |
|----------|----------|------|--------|
| `$mock.name` | `{{$mock.name}}` | 随机中文姓名 | `张三` |
| `$mock.nameEn` | `{{$mock.nameEn}}` | 随机英文姓名 | `John Smith` |
| `$mock.firstName` | `{{$mock.firstName}}` | 随机中文姓 | `李` |
| `$mock.lastName` | `{{$mock.lastName}}` | 随机中文名 | `明` |
| `$mock.email` | `{{$mock.email}}` | 随机邮箱 | `test@example.com` |
| `$mock.phone` | `{{$mock.phone}}` | 随机手机号 | `13812345678` |
| `$mock.idCard` | `{{$mock.idCard}}` | 随机身份证号（18位） | `110101199001011234` |
| `$mock.address` | `{{$mock.address}}` | 随机中文地址 | `北京市朝阳区xxx街道` |
| `$mock.city` | `{{$mock.city}}` | 随机城市 | `上海` |
| `$mock.province` | `{{$mock.province}}` | 随机省份 | `广东省` |
| `$mock.company` | `{{$mock.company}}` | 随机公司名 | `XX科技有限公司` |
| `$mock.word` | `{{$mock.word}}` | 随机词语 | `测试` |
| `$mock.sentence` | `{{$mock.sentence}}` | 随机句子 | `这是一个测试句子。` |

**注**: `$mock.sentence` 生成的句子末尾包含中文句号。

**总计: 45 个变量**（其中 3 个 UUID 别名计为 1 个唯一变量，实际唯一变量 43 个）

---

## 6. 变量替换流程

### 6.1 替换顺序

```
请求发送
    │
    ▼
┌─────────────────────────────────┐
│ replaceVariables(text, env)     │
│                                 │
│ 1. 先替换内置变量（$前缀）       │
│    匹配 {{$变量名}} 或           │
│           {{$变量名:参数}}       │
│    大小写不敏感                  │
│                                 │
│ 2. 再替换环境变量                │
│    匹配 {{变量名}}               │
│    从 env 查找值                 │
│                                 │
│ 3. 未匹配则保留原样              │
└─────────────────────────────────┘
    │
    ▼
发送实际请求
```

### 6.2 变量缓存行为

**同一请求内**，多次使用相同变量返回**相同值**：

| 场景 | 行为 |
|------|------|
| `{{$timestamp}}` 出现 3 次 | 3 次返回相同时间戳 |
| `{{$guid}}` 出现 2 次 | 2 次返回相同 UUID |
| `{{$randomInt:1:100}}` 出现多次 | 每次返回相同的随机数 |

**实现方式**: 在单次 `replaceVariables` 调用内，使用 `Map` 缓存已生成的值。

```typescript
// 缓存键 = 变量名的小写形式（含参数）
const cacheKey = name.toLowerCase();
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 6.3 替换函数签名

```typescript
export interface VariableContext {
  /** 缓存已生成的变量值 */
  cache: Map<string, string>;
  /** 当前时间戳（确保同一请求内一致） */
  timestamp: number;
}

export function replaceVariables(
  text: string,
  env: Record<string, any>,
  context?: VariableContext  // 可选上下文，用于缓存
): string;
```

---

## 7. 错误处理规范

### 7.1 无效参数处理

| 输入 | 问题 | 结果 | 日志 |
|------|------|------|------|
| `{{$randomInt:abc:def}}` | 非数字参数 | 保留原样 | WARN: invalid params |
| `{{$randomInt:10:5}}` | min > max | 保留原样 | WARN: min > max |
| `{{$randomString:-5}}` | 负数长度 | 保留原样 | WARN: length < 0 |
| `{{$randomInt::100}}` | 缺失参数 | 保留原样 | WARN: missing param |
| `{{$unknown}}` | 未知变量 | 保留原样 | DEBUG: unknown var |

### 7.2 边界条件处理

| 边界条件 | 处理方式 | 结果 |
|----------|---------|------|
| `$randomInt:0:0` | min=max | 返回 `0` |
| `$randomInt:5:5` | min=max | 返回 `5` |
| `$randomString:0` | 长度为0 | 返回空字符串 `""` |
| `$randomString:1` | 最小长度 | 返回 1 位随机字符 |
| `$randomString:10000` | 超长请求 | 正常生成（无上限） |
| `$randomFloat:0:0` | min=max=0 | 返回 `0.000000` |
| `$randomFloat:5:5` | min=max | 返回 `5.000000` |
| `$randomFloat:-1:1` | 负数范围 | 正常生成（如 `-0.500000`） |

### 7.3 错误处理原则

1. **不抛出异常** - 保持请求流程不中断
2. **保留原样** - 无效变量保持 `{{$xxx}}` 形式
3. **记录日志** - 在控制台输出警告信息

---

## 8. 帮助抽屉组件设计

### 8.1 布局

```
┌─────────────────────────────────────────────────────────────┐
│ 内置变量参考                                         [✕]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 搜索变量...                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 📅 日期时间 (17)                                     [▼]   │
│ ├─ $timestamp      当前时间戳（秒）          [复制]        │
│ ├─ $timestampMs    当前时间戳（毫秒）        [复制]        │
│ └─ ...                                                      │
│                                                             │
│ 🎲 随机数 (15)                                       [▼]   │
│ ├─ $guid           UUID v4                  [复制]        │
│ └─ ...                                                      │
│                                                             │
│ 👤 Mock 数据 (13)                                    [▼]   │
│ ├─ $mock.name      随机中文姓名             [复制]        │
│ └─ ...                                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 交互规格

| 交互 | 行为 |
|------|------|
| 打开/关闭 | 点击顶部标题栏问号图标切换 |
| 宽度 | 50%（与 Response 面板一致） |
| 定位 | `position: fixed; right: 0; top: 0; height: 100vh; z-index: 100` |
| 复制 | 点击「复制」按钮复制 `{{$变量名}}` 到剪贴板，显示「已复制」Toast 提示 2 秒 |
| 搜索 | 顶部搜索框实时过滤变量列表，模糊匹配变量名和描述 |
| 分类折叠 | 点击分类标题可折叠/展开该分类，默认全部展开 |

### 8.3 状态管理

抽屉状态放在 `DevToolsPanel.tsx` 组件内:

```typescript
const [showBuiltinVarsDrawer, setShowBuiltinVarsDrawer] = useState(false);
```

---

## 9. 环境变量校验规则

### 9.1 禁止的前缀

- `uv.` — 保留给脚本中动态设置的变量

### 9.2 校验时机与 UI 反馈

| 操作 | 校验位置 | 失败反馈 |
|------|----------|----------|
| 添加变量 | `handleAddVariable` | Inline 错误提示（红色文字，显示在输入框下方） |
| 更新变量 | `handleUpdateVariable` | Inline 错误提示（红色文字，显示在输入框下方） |
| 导入变量 | 导入处理函数 | 弹窗提示失败条目 |

### 9.3 错误提示

```
⚠️ 变量名不能以 "uv." 开头，此前缀保留给脚本动态变量使用
```

### 9.4 校验函数

```typescript
// src/utils/variables/validation.ts
export const RESERVED_PREFIXES = ['uv.'];

export function validateVariableName(name: string): { valid: boolean; error?: string } {
  for (const prefix of RESERVED_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      return {
        valid: false,
        error: `变量名不能以 "${prefix}" 开头，此前缀保留给脚本动态变量使用`
      };
    }
  }
  return { valid: true };
}
```

---

## 10. 类型定义

```typescript
// src/utils/variables/types.ts

export interface BuiltinVariable {
  /** 变量标识，如 $timestamp */
  name: string;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description: string;
  /** 所属分类 */
  category: 'datetime' | 'random' | 'mock';
  /** 是否支持参数 */
  hasParams?: boolean;
  /** 参数格式说明，如 "min:max" */
  paramsFormat?: string;
  /** 参数示例，如 "1:100" */
  paramsExample?: string;
  /** 生成函数 */
  generate: (params?: string, context?: VariableContext) => string;
}

export interface VariableCategory {
  id: 'datetime' | 'random' | 'mock';
  label: string;
  icon: string;
  variables: BuiltinVariable[];
}

export interface VariableContext {
  /** 缓存已生成的变量值 */
  cache: Map<string, string>;
  /** 当前时间戳（确保同一请求内一致） */
  timestamp: number;
}
```

---

## 11. 身份证号生成规格

`$mock.idCard` 生成 18 位身份证号：

```
格式: GGGGGGYYYYMMDDXXXR

- GGGGGG: 6位地区码（随机选取）
- YYYYMMDD: 8位出生日期
- XXX: 3位顺序码（奇数为男性，偶数为女性）
- R: 1位校验码（ISO 7064:1983.MOD 11-2）
```

**校验码算法**:
1. 前17位数字分别乘以权重因子 [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2]
2. 将乘积相加得到 S
3. S mod 11 得到索引
4. 根据索引查表得到校验码：['1','0','X','9','8','7','6','5','4','3','2']

---

## 12. 实现任务清单

### Phase 1: 基础架构
- [ ] 创建 `src/utils/variables/` 目录结构
- [ ] 实现 `types.ts` 类型定义
- [ ] 实现 `validation.ts` 校验函数
- [ ] 实现 `mock-data.ts` 中文 Mock 数据源

### Phase 2: 变量实现
- [ ] 实现 `datetime.ts` 日期时间变量（含缓存支持）
- [ ] 实现 `random.ts` 随机数变量（含缓存支持）
- [ ] 实现 `mock.ts` Mock数据变量（含身份证算法）
- [ ] 实现 `replaceVariables` 统一替换函数（含缓存上下文）

### Phase 3: 兼容性处理
- [ ] 更新 `variable.ts` 从新模块重新导出
- [ ] 添加别名变量映射（$uuid, $randomUuid → $guid）

### Phase 4: UI组件
- [ ] 实现 `BuiltinVariablesDrawer.tsx` 抽屉组件
- [ ] 修改 `DevToolsPanel.tsx` 添加帮助图标
- [ ] 修改 `EnvironmentManager.tsx` 添加校验

### Phase 5: 测试
- [ ] 单元测试：变量生成函数
- [ ] 单元测试：变量替换函数（含缓存）
- [ ] 单元测试：校验函数
- [ ] 单元测试：身份证生成算法
- [ ] 集成测试：完整请求流程

---

## 13. 向后兼容性

### 13.1 现有变量保留策略

所有现有变量完全保留，无需用户修改现有请求。

| 现有变量 | 状态 | 说明 |
|----------|------|------|
| `$guid` | 保留 | 行为不变 |
| `$uuid` | 保留 | 行为不变 |
| `$randomUuid` | 保留 | 行为不变 |
| `$randomuuid` | 保留 | 别名映射到 `$randomUuid` |
| `$timestamp` | 保留 | 行为不变 |
| `$timestampms` | 保留 | 别名映射到 `$timestampMs` |
| `$date` | 保留 | 行为不变 |
| `$datetime` | 保留 | 行为不变 |
| `$datetimeiso` | 保留 | 别名映射到 `$datetimeIso` |
| `$datetimerfc` | 保留 | 别名映射到 `$datetimeRfc` |
| `$time` | 保留 | 行为不变 |
| `$year` ~ `$second` | 保留 | 行为不变 |
| `$randomint` | 保留 | 别名映射到 `$randomInt` |
| `$randomfloat` | 保留 | 别名映射到 `$randomFloat` |
| `$randomstring` | 保留 | 别名映射到 `$randomString` |
| `$randomcolor` | 保留 | 别名映射到 `$randomColor` |
| `$randomhex` | 保留 | 别名映射到 `$randomHex` |
| `$localip` | 保留 | 别名映射到 `$localIp` |

### 13.2 兼容性措施

- 保留原有 `src/utils/variable.ts` 文件，从新模块重新导出
- 环境变量替换 `{{xxx}}` 格式保持不变
- 现有代码无需修改
- 大小写不敏感匹配确保所有现有用法继续有效

---

## 14. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 变量名冲突 | 用户定义了同名变量 | 内置变量优先级高于环境变量 |
| 性能问题 | 大量变量替换耗时 | 使用正则预编译，单次请求内缓存 |
| Mock数据真实性 | 生成的数据可能不符合预期 | 提供丰富的数据源，文档说明 |
| 身份证号校验 | 生成的身份证可能无法通过严格校验 | 仅用于测试目的，文档说明 |

---

## 15. 未来扩展

- 支持自定义变量模板
- 更多 Mock 数据类型（银行卡、车牌号等）
- 变量预览功能（实时显示生成值）
- 支持参数化 Mock（如 `$mock.email:domain.com`）
- 自定义日期格式化（如 `$datetime:YYYY-MM-DD HH:mm:ss`）
