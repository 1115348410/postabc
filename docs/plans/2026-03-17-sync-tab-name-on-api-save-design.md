# API保存后同步Tab名称设计

## 背景

当前保存API成功后，Tab名称不会同步更新为用户设定的名字。用户需要在保存后手动刷新或重新打开才能看到更新后的名称。

## 需求

保存API成功后（无论是新建还是编辑改名），Tab名称需要自动同步更新为用户设定的名字。

## 设计方案

### 数据流

```
用户输入名称 → 点击保存 → 调用服务端 createApi/updateApi 接口 → 成功后触发 onSaveSuccess(apiUuid, parentUuid, name) 
    → handleSaveSuccess 接收参数 → updateTab({ name }) → Tab名称同步更新
```

### 改动清单

| 文件 | 改动内容 |
|------|----------|
| `src/components/SaveRequestDialog.tsx` | 扩展 `onSaveSuccess` 回调类型，增加 `name` 参数；保存成功后传递 `name` |
| `src/components/ApiTabPanel.tsx` | 修改 `handleSaveSuccess` 接收 `name` 参数，调用 `updateTab` 更新 tab 名称 |

### 代码改动

#### 1. SaveRequestDialog.tsx

```typescript
// 修改回调类型定义（约第27行）
onSaveSuccess: (apiUuid?: string, parentUuid?: string, name?: string) => void;

// 修改 handleSave 函数，保存成功后传递 name（约第222行）
if (isEditMode && apiUuid) {
  await apiClient.updateApi(apiUuid, { ... });
  onSaveSuccess(apiUuid, selectedFolderUuid, name);
} else {
  const newUuid = await apiClient.createApi(name, selectedFolderUuid, { ... });
  onSaveSuccess(newUuid, selectedFolderUuid, name);
}
```

#### 2. ApiTabPanel.tsx

```typescript
// 修改 handleSaveSuccess 函数签名和实现（约第194行）
const handleSaveSuccess = (apiUuid?: string, parentUuid?: string, name?: string) => {
  setSidebarKey((k) => k + 1);
  
  if (activeTab && apiUuid) {
    updateTab(activeTab.id, { 
      apiUuid, 
      parentUuid,
      ...(name && { name }),  // 同步更新名称
      isModified: false       // 保存后重置修改标记
    });
  }
};
```

### 边界情况

- **name 为空时**：不更新 tab 名称（保留原有名称）
- **activeTab 不存在时**：不执行更新操作

## 影响范围

- 仅影响 API 保存流程，不影响其他功能
- 改动量小，测试简单
