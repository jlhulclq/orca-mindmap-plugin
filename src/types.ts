// 类型定义文件
export interface Block {
  id: string;
  text: string;
  children: string[];
  parent?: string;
  properties?: any;
  type?: string; // 添加type字段，用于识别块类型如table2
}

export interface TreeNode {
  id: string;
  content: string;
  children: TreeNode[];
  level: number;
  parent?: string;
}

export interface OrcaAPI {
  state: {
    blocks: Record<string, Block>;
    apiVersion: string;
    themeMode: string;
    subscribe: (callback: (state: any) => void) => void;
  };
  commands: {
    registerCommand: (id: string, handler: Function, description: string) => void;
    unregisterCommand: (id: string) => void;
    registerShortcut: (shortcut: string, commandId: string) => void;
    unregisterShortcut: (shortcut: string) => void;
    invokeCommand: (id: string) => void;
  };
  toolbar: {
    registerToolbarButton: (id: string, config: any) => void;
    unregisterToolbarButton: (id: string) => void;
  };
  nav: {
    addPanel: (id: string, config: any) => Promise<string>;
    closePanel: (id: string) => void;
  };
  notify: (type: string, message: string, options?: any) => void;
  plugins: {
    setData: (pluginId: string, key: string, data: any) => Promise<void>;
    getData: (pluginId: string, key: string) => Promise<any>;
    setSettingsSchema: (pluginId: string, schema: any) => Promise<void>;
  };
  broadcasts: {
    registerHandler: (event: string, handler: Function) => void;
    unregisterHandler: (event: string, handler: Function) => void;
    emit: (event: string, data: any) => void;
  };
}

declare global {
  interface Window {
    orca: OrcaAPI;
  }
}