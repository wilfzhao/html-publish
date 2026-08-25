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
