// 测试环境设置文件

// 模拟虎鲸笔记API
const mockOrca = {
  state: {
    blocks: {},
    apiVersion: '1.5.0',
    themeMode: 'light',
    subscribe: jest.fn()
  },
  commands: {
    registerCommand: jest.fn(),
    unregisterCommand: jest.fn(),
    registerShortcut: jest.fn(),
    unregisterShortcut: jest.fn(),
    invokeCommand: jest.fn()
  },
  toolbar: {
    registerToolbarButton: jest.fn(),
    unregisterToolbarButton: jest.fn()
  },
  nav: {
    addPanel: jest.fn().mockResolvedValue('panel-id-123'),
    closePanel: jest.fn()
  },
  notify: jest.fn(),
  plugins: {
    setData: jest.fn().mockResolvedValue(undefined),
    getData: jest.fn().mockResolvedValue(null),
    setSettingsSchema: jest.fn().mockResolvedValue(undefined)
  },
  broadcasts: {
    registerHandler: jest.fn(),
    unregisterHandler: jest.fn(),
    emit: jest.fn()
  }
};

// 设置全局window对象
Object.defineProperty(window, 'orca', {
  value: mockOrca,
  writable: true
});

// 模拟CSS样式导入
jest.mock('../styles/main.css', () => ({}));

// 清理函数，在每个测试后重置mock
afterEach(() => {
  jest.clearAllMocks();
});