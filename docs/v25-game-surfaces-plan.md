# v25 全部弹出界面的游戏化改造

2026-10-24。回应“弹窗像软件操作台”。本轮使用 Game Studio 的界面与试玩流程，保留原玩法与冻结 v22 对照页，覆盖当前正式版本的全部弹出界面。

## 调研与设计依据

1. [Flywheel：Dead Space 与 Resident Evil 6 的界面对比](https://www.flywheelstrategic.com/thinking/post/flywheel-blog/2022/09/07/what-we-can-learn-from-diegetic-ui-in-gaming)：世界内的设备外观本身不保证沉浸；信息需要保持一致、清楚并贴近实际动作。本文是设计分析，不是开发者实验或玩家统计。
2. [Polygon：Ghost of Tsushima 的 Guiding Wind](https://www.polygon.com/ghost-of-tsushima-guide/21311855/how-to-use-the-guiding-wind-technique-points/)：玩家先明确追踪目标，再主动唤起环境引导，关键目标名称仍保留。借鉴“按需提示与场景回应”，不照搬风向导航，也不删除本作必要的精确战损。
3. [Xbox XAG 101](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101)：文字大小、行距、行宽与缩放是可读性的组成。正文使用清楚的中文字体和稳定底色，装饰字只用于短标题。本轮采用其相关原则，不声称完成全部 XAG 认证。
4. [Xbox XAG 113](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113)：当前焦点必须明显且留在可见区域。选中、已佩戴、费用不足不能只靠微弱光晕表达。
5. [Xbox XAG 117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117)：可关闭非必要运动；阅读区域避免背景持续运动。翻卷、选中、归卷仅在状态切换时发生，减少动态时给出静态等价状态。
6. [Game Accessibility Guidelines：操作目标大小与间距](https://gameaccessibilityguidelines.com/ensure-interactive-elements-virtual-controls-are-large-and-well-spaced-particularly-on-small-or-touch-screens/)：鼠标操作也需要足够的命中区域和间距。本轮 PC 主动作采用不小于 42px 的点击高度；这个数值是本作约定，不冒称来源原文中的统一像素标准。

以上网页正文已读取；检索失败或无关的结果不作为证据。来源、读取方式与落地项记录在 `research/ui-v25-sources.json`。没有收集真人样本或推导留存提升。

## 当前问题与改造原则

用户当前 v22 对照页显示的是“标题栏 + 三列属性 + 次操作行”的莲灯界面。当前版本的老界面也保留相同问题：同一矩形模板承载不同目的，按钮与卡片等权，条目比物件更突出，返回与确认语义不统一。v24 对少量新页面的书卷处理没有覆盖全部旧界面。

将界面按玩家动作分成三种体验：

- **场景仪式**：莲灯、取舍、开门、机关、战斗预览、对白与短反馈。锚定真实对象，先呈现代价与一个主要动作；不转成网页弹窗。
- **歇息卷册**：行囊、人物、手记、敌情、舍利、存读档、指引、声音、画境、推演、挑战与记录。整场暂停，使用布囊、人物画轴、经卷、灯笺等不同构图；不保留侧栏例外。
- **叙事仪式**：入层、技能、最终布阵、归真、结局、力竭与重开。用状态驱动的短入场和明确的继续 / 确认，跳过不重复扣费。

材质用旧绢、纸签、朱印、铜件和实际游戏资产。减少等权矩形卡片、重复分隔框、默认表单感与长段说明。正文和真实数值有稳定、不透景的底衬；角色或场景视觉不能替代文字条件。

## 覆盖清单与实施顺序

|阶段|范围|验收重点|
|---|---|---|
|P0|所有暂停视图与独立场景层建立清单、冻结基线|明确每个入口、返回、数据来源和代表画面；原对照版本不改。|
|P1|共用暂停、行旅、行囊、人物、画境|不同物件构图、高清角色、选择清楚、费用与返回不改变。|
|P2|因果簿、敌情、舍利、指引、声音、存读档|信息按问题组织；不把18层列表、公式和设置同时展开；关键选项始终可找到。|
|P3|莲灯、取舍、目标信息、对白、短反馈|改变操作台外观；保持场景锚点、确认边界和输入阻断；小 PC 面板不溢出。|
|P4|推演、试炼、入层、神通、最终布阵、归真、结局、力竭、重开|统一材质、动效与焦点，保留各自玩法语义；危险动作仍明确说明。|
|P5|PC 双画境、真实键鼠、离线与存档验证|629×678 的当前 PC 面板、1280×720、1440×900 与宽屏；截图逐张原尺寸看，不能只凭源码和元素存在通过。|

地图、确定性战斗、有限资源、十八层、两结局、F / R / T 和 `index.html` 直开维持原合同。验证用正常开局或合法动作生成的章节存档，不注入资源证明可达。

实现和实际证据写入 `docs/v25-game-surfaces-review.md`、`research/ui-v25-progress.json`。真人对偏好、理解、疲劳和复玩的判断仍与技术 / 视觉验收分开。
