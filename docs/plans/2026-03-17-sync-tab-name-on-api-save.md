# API保存后同步Tab名称实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 保存API成功后，自动将Tab名称同步更新为用户设定的名字（支持新建和编辑改名两种场景）。

**Architecture:** 扩展 `onSaveSuccess` 回调传递 `name` 参数，在 `handleSaveSuccess` 中调用 `updateTab` 更新 tab 名称。

**Tech Stack:** React, TypeScript, Zustand

---

## Task 1: 修改 SaveRequestDialog 回调类型和调用

**Files:**
- Modify: `d:/AiOnUiWorkspace/project/postabc/src/components/SaveRequestDialog.tsx`

**Step 1: 修改 onSaveSuccess 回调类型定义**

找到 `SaveRequestDialog` 组件的 props 接口定义（约第21-27行），修改 `onSaveSuccess` 的类型：

```typescript
// 修改前
onSaveSuccess: (apiUuid?: string, parentUuid?: string) => void;

// 修改后
onSaveSuccess: (apiUuid?: string, parentUuid?: string, name?: string) => void;
```

**Step 2: 修改 handleSave 函数，保存成功后传递 name**

找到 `handleSave` 函数中调用 `onSaveSuccess` 的位置（约第220-225行），修改为传递 `name` 参数：

```typescript
// 修改前（约第220-225行）
if (isEditMode && apiUuid) {
  await apiClient.updateApi(apiUuid, { ... });
  onSaveSuccess(apiUuid, selectedFolderUuid);
} else {
  const newUuid = await apiClient.createApi(name, selectedFolderUuid, { ... });
  onSaveSuccess(newUuid, selectedFolderUuid);
}

// 修改后
if (isEditMode && apiUuid) {
  await apiClient.updateApi(apiUuid, { ... });
  onSaveSuccess(apiUuid, selectedFolderUuid, name);
} else {
  const newUuid = await apiClient.createApi(name, selectedFolderUuid, { ... });
  onSaveSuccess(newUuid, selectedFolderUuid, name);
}
```

**Step 3: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误

**Step 4: Commit**

```bash
git add src/components/SaveRequestDialog.tsx
git commit -m "feat: onSaveSuccess callback add name parameter"
```

---

## Task 2: 修改 ApiTabPanel 接收并更新 tab 名称

**Files:**
- Modify: `d:/AiOnUiWorkspace/project/postabc/src/components/ApiTabPanel.tsx`

**Step 1: 修改 handleSaveSuccess 函数签名和实现**

找到 `handleSaveSuccess` 函数（约第194-200行），修改为：

```typescript
// 修改前
const handleSaveSuccess = (apiUuid?: string, parentUuid?: string) => {
  setSidebarKey((k) => k + 1);
  
  if (activeTab && apiUuid) {
    updateTab(activeTab.id, { apiUuid, parentUuid });
  }
};

// 修改后
const handleSaveSuccess = (apiUuid?: string, parentUuid?: string, name?: string) => {
  setSidebarKey((k) => k + 1);
  
  if (activeTab && apiUuid) {
    updateTab(activeTab.id, { 
      apiUuid, 
      parentUuid,
      ...(name && { name }),
      isModified: false
    });
  }
};
```

**Step 2: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误

**Step 3: Commit**

```bash
git add src/components/ApiTabPanel.tsx
git commit -m "feat: sync tab name on api save success"
```

---

## Task 3: 手动测试验证

**测试场景 1: 新建API保存**
1. 打开应用，创建新的 API 请求
2. 输入请求信息，点击保存
3. 在保存对话框中输入名称（如 "测试接口A"）
4. 保存成功后，验证 Tab 名称是否显示为 "测试接口A"

**测试场景 2: 编辑API改名**
1. 从侧边栏打开已保存的 API
2. 点击保存，修改名称（如改为 "测试接口B"）
3. 保存成功后，验证 Tab 名称是否更新为 "测试接口B"

**测试场景 3: 修改标记重置**
1. 打开已保存的 API，修改请求内容
2. 验证 Tab 名称后显示 "•" 标记（表示已修改）
3. 保存后，验证 "•" 标记消失

---

## 验收标准

- [ ] 新建 API 保存后，Tab 名称同步更新
- [ ] 编辑 API 改名后，Tab 名称同步更新
- [ ] 保存后 `isModified` 标记重置为 false
- [ ] TypeScript 编译无错误
