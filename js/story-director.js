/* Narrative shot plans refer to actual unlocked abilities and rescued people. */
(() => {
  'use strict';
  const line=(label,speaker,text,portrait='lantern')=>({label,speaker,text,portrait});
  function shots(kind,d={}){
    const saved=d.rescued||[],bajie=saved.includes('bajie'),companion=bajie?'八戒':'点灯僧',portrait=bajie?'bajie':'lantern',choices=d.choices||{};
    if(kind==='confrontation')return [line('自己的影子','心猿','你留过的力量、舍过的路，都在俺这三相里。','wukong'),line('来路仍在',companion,bajie?'水脉俺守过。这一回，换俺替你守住归路。':'你一路点亮的灯，已经照到了黑莲之前。',portrait),line('以本心破阵','孙悟空','破执、见微、同行。先看三相，再定三印。','wukong')];
    if(kind==='seal'){
      const r=window.TowerData.relics[d.relic??0],name=r?.name||'心印';
      const vow={staff:'金箍所及，断路也能走。',morph:'化作青蝉，门缝也是坦途。',clone:'一根毫毛，也能替众生守住另一端。',ward:'心若先定，烈火也伤不到慈悲。',truth:'走得再远，也该回头看看来路。'}[r?.ability];
      const next={staff:'金箍架桥已醒。去找断口，也可回访旧路。',morph:'靠近铁栅或普通青锁门，用化形卸锁。',clone:'四格内的青色阵眼，可以留下分身。',ward:'定心护身常驻，法术战损已随之改变。',truth:'回第一层开启归根之匣，取出最后的朱钥。'}[r?.ability];
      const echo=r?.ability==='truth'&&choices.sevenWounds==='rescue'?'你护送的三道身影，已经替后来人接上归路。':r?.ability==='ward'&&bajie?'俺守住了水脉，你也该把自己的心接回来。':`${d.externalRelics??3} 枚外舍利归位，${name}回应了你的脚步。`;
      return [line('旧愿回应',r?.ability==='ward'&&bajie?'八戒':'点灯僧',echo,r?.ability==='ward'&&bajie?'bajie':'lantern'),line('本心显现','孙悟空',vow||'这条路，俺来接上。','wukong'),line('前路新开','此行',next||'新的心印已经归位。','wukong')];
    }
    if(kind==='boss')return [line('金甲先手','心猿','若只会挥棒，你怎接得住自己的嗔怒？','wukong'),line('执念重甲','孙悟空',d.seals?.[1]==='staff'?'这一棒，破的是俺自己的执念。':'甲再重，也不是你困住俺的理由。','wukong'),line('心火归寂','点灯僧','三相已散。走向莲阵，照见最后那颗心。')];
    if(kind==='awakening')return [line('中央空位','点灯僧','十六枚都在，为何中央始终空着？'),line('照见自身','孙悟空','最后这颗不是宝物，是俺愿意回头的这颗心。','wukong'),line('亲自选择','此行','无骨归真。走向莲台，选择与众生归去或留灯。','wukong')];
    if(kind==='release')return [line('将光交还','孙悟空','这一棒，替众生打开归路。','wukong'),line('归途有声',companion,bajie?(saved.includes('tangseng')?'师父和俺们都在。猴哥，回家了。':'猴哥！俺们在归路尽头等你。'):'众生的呼唤，会为行者留下归路。',portrait),line('塔外晨光','此行','十七道光散入晨雾，你选择与众生归去。','wukong')];
    if(kind==='keep')return [line('留下的人','孙悟空','你们先走。塔里的这盏灯，俺来守。','wukong'),line('一灯长明','点灯僧','留灯的人，也有人记得回来看望。'),line('后来之路','此行','长明灯已留在塔心，众生仍可离塔。','wukong')];
    return [];
  }
  window.TowerStoryDirector={shots,duration:kind=>kind==='seal'?5200:kind==='boss'?7800:kind==='confrontation'?5700:6400};
})();
