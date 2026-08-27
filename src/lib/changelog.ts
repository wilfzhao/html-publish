export type ChangelogCategory = 'new' | 'improved' | 'fixed';

export interface ChangelogSection {
  category: ChangelogCategory;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  summary: string;
  sections: ChangelogSection[];
}

// 发布新版本时，在数组顶部追加一条记录即可。
export const changelog: ChangelogRelease[] = [
  {
    version: '0.2.0',
    date: '2026-08-27',
    title: 'UI 标注与评审协作',
    summary: '支持直接在原型中标记需要调整的区域，让产品反馈更准确、更容易共享。',
    sections: [
      {
        category: 'new',
        items: [
          '新增 UI 标注模式，可通过单击或拖拽选中原型区域并填写修改要求。',
          '新增标注清单和编号，可快速查看并定位原型中的对应区域。',
          '支持复制带标注的版本链接，评审人员可在公开预览页查看标注内容。',
        ],
      },
      {
        category: 'improved',
        items: [
          '项目详情改为专注预览的全屏工作区，减少侧边导航对原型空间的占用。',
          '优化标注区域的元素识别和边缘锚定，页面尺寸或布局变化后仍能准确跟随。',
          '优化跨页面、弹窗和交互状态下的标注定位，可自动回到标注所在位置。',
        ],
      },
      {
        category: 'fixed',
        items: [
          '修复标注在滚动、窗口缩放和动态内容变化后可能出现的位置偏移。',
          '修复复制分享链接时可能使用本地地址而非正式对外地址的问题。',
        ],
      },
    ],
  },
  {
    version: '0.1.15',
    date: '2026-08-25',
    title: '团队试用版',
    summary: '完善原型发布流程，并补齐面向产品经理的使用指引。',
    sections: [
      {
        category: 'new',
        items: [
          '新增系统内置使用帮助，覆盖创建、上传、分享和版本管理流程。',
          '新增发布日志，集中记录每个系统版本的功能与修改。',
        ],
      },
      {
        category: 'improved',
        items: [
          '优化项目授权流程，确保 Codex 发布到正确的目标项目。',
        ],
      },
    ],
  },
];
