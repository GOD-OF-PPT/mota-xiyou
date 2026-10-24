# v6：全屏场景、游戏提示与双画境

**验收结果：已通过下述实机范围。** 自动回放不能代替玩家对美术与游戏感的判断。

## 对照与目标

三维参考：`assets/material/reference-selected.png`；像素参考：`assets/mural/reference-selected.png`。两图只作美术方向，不能把画中路径或整图冒充实时关卡。

- `audits/v6-desktop-material.png` / `v6-desktop-mural.png`：同一实际进度、同一视口和视野，通过真实风格切换获得。
- `audits/v6-style-comparison.png`：上述两张实图等比缩小并排，左玄金、右青绿。
- `audits/v6-mobile-material.png` / `v6-mobile-mural.png`，`v6-landscape-material.png` / `v6-landscape-mural.png`：窄屏和横屏。
- `tests/v6-ui-target.png`：普通临战符签；`audits/v6-rules-edge-scroll.png`：主动展开的规则卷册。
- `tests/v6-fx-fight.png`、`v6-fx-door.png`、`v6-fx-pickup.png`、`v6-fx-cast.png`、`v6-fx-reduced.png`：合法实际行动效果。
- `audits/v6-boss-scene-preview.png`、`v6-boss-preparation-scroll.png`、`v6-self-awakening.png`、`v6-ending-release.png`、`v6-ending-keep.png`：首领、准备、觉醒与结局。

已打开审查实际图像，未以文件存在或DOM尺寸代替视觉核对。

## 每步反思与修正

1. **方形棋盘被常驻面板夹住。** 改成全视口画布，左上仅生命/灵息/钥匙，右上层名/工具。C才展开人物详情。手机格点过小时默认近观，M手动选择后resize不替玩家改模式。
2. **去掉蒙版仍像网页确认卡。** 首轮286×350左右的战前框仍遮佛龛，未予放行。最终符签桌面228×134、手机228×130，只保留目标、损失、战后生命和小行动入口；属性、临界、公式主动展开至边缘卷册。
3. **提示缺少游戏语言。** 通知改『得／回』符字，目标改『观』印和短金线，剧情改非阻断对白条。短促入场后静止，减弱动态静态等价。无蒙版、网页alert/confirm、role=dialog、aria-modal。普通通知与剧情不借用卷册层。
4. **预览可能被连续输入误确认。** 首次碰撞或交互只预览；新按一次E或点击迎战才结算。repeat E、方向和空格不代为确认，取消不扣资源。
5. **长翎缩小人物，旧头像只见小全身。** 校准源帧切界、脚点双侧范围和统一动作倍率，补独立高分辨率脸肩图。两位同道初稿偏离设定，已定向修正并保留原稿。
6. **玄金仍缺少空间层次。** 地图外加入无角色、道具和格点的远景寺崖/雾，近墙基向外退去；佛掌填入真实阻挡石龛。内部始终绘制真实关卡，可走格不会被建筑盖住。
7. **动效位置容易误读。** 步行读真实移动；棒击有蓄势、前冲、命中、收势；目标后震消散，净生命损失显示在悟空上方。门、拾取、神通和觉醒均读权威事件，跳过不改结算。

## 实际流程证据

`audits/v6-browser-acceptance.json`：全部18层、16枚外舍利、6法器、7契约、真实换层、弱水/救援/双塔/分身、三套首领准备、觉醒、双结局、精确手动存读档；pageerror为0。四道新避战门确实被走过。

同一脚本覆盖首次E、连续输入保护、开门取消/扣钥/回溯、有限凝息珠奉献、人物卷册不改state、对白收起不丢页，以及两画境切换前后完整snapshot相同。

`audits/v6-upper-sprite-picking.json`：两套风格均选择真实不透明的蝠妖上部像素；严格格点是上邻格，pickCell正确归回蝠妖所在格，真实鼠标点击选中同一实体且state不变。

`tests/v6-renderer-effects-report.json`：四类实际动作及跳过保持状态。`tests/v6-ui-final-results.json`：最终尺寸、视野与输入；初轮失败已标记为 `*-first*`。

`audits/v6-offline-check.json`：Chrome直接打开file协议、阻断HTTP/HTTPS请求，两风格均本地载入成功；网络请求0，切换不改state。无需构建或后端。

## 美术与边界

玄金是**三维材质风格的预渲染二维图集**，不宣称实时三维模型或PBR几何。两套原图、裁帧、锚点独立，基础寻址ID兼容；核对了PNG实际加载、帧边界、alpha、锚点和manifest一致性。

内置ImageGen生成的生产提示规格、来源与技术修正见 `assets/material/prompts.json`、`assets/material/README.md`。玄金151个ID含别名、110组唯一帧、9张运行PNG；壁画145个ID含别名、105组帧、9张PNG。没有以换色旧图冒充新资源。

未执行真人首次理解度、主观音频评价或真实手机性能测量。v5记录已保存至 `.backups/v6-before/design-qa.md`；旧截图属于历史版本。逐步实施记录在 `research/immersive-v6.json` 和 `research/immersive-ui-reflection-v6.json`。
