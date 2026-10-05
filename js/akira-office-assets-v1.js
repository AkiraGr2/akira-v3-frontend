/*
 * AKIRA OFFICE — Free asset registry V1
 *
 * Runtime transport is pinned to a public GitHub mirror whose CREDITS.md
 * maps each file back to its original CC0 source pack/creator.
 * Keep source/licensing metadata with every runtime asset.
 */

(function(){
  "use strict";

  const MIRROR_REPO = "yadneshSalvi/hearth-webmcp";
  const MIRROR_COMMIT = "617d6073a557cbc2f0f2ac917916e01b9c4b631b";
  const LOCAL_BASE = "./assets/office/";
  const CDN_BASE = "https://cdn.jsdelivr.net/gh/" + MIRROR_REPO + "@" + MIRROR_COMMIT + "/public/assets/glb/";
  const RAW_BASE = "https://raw.githubusercontent.com/" + MIRROR_REPO + "/" + MIRROR_COMMIT + "/public/assets/glb/";

  const ASSETS = Object.freeze({
    desk: Object.freeze({
      id:"quaternius-desk-v86",
      file:"desk-kari.glb",
      category:"desk",
      creator:"Quaternius",
      sourcePack:"Furniture Pack via Poly Pizza",
      sourceUrl:"https://poly.pizza/bundle/Furniture-Pack-pgvx8Zkq8v",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true
    }),
    chair: Object.freeze({
      id:"kenney-chairDesk",
      file:"chair-olve.glb",
      category:"chair",
      creator:"Kenney",
      sourcePack:"Furniture Kit 2.0",
      sourceUrl:"https://kenney.nl/assets/furniture-kit",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true
    }),
    shelf: Object.freeze({
      id:"quaternius-bookcase-books",
      file:"shelf-kant.glb",
      category:"shelf",
      creator:"Quaternius",
      sourcePack:"Furniture Pack via Poly Pizza",
      sourceUrl:"https://poly.pizza/bundle/Furniture-Pack-pgvx8Zkq8v",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true
    }),
    lamp: Object.freeze({
      id:"kenney-floor-lamp",
      file:"floor-lamp-arc.glb",
      category:"lamp",
      creator:"Kenney",
      sourcePack:"Furniture Kit 2.0",
      sourceUrl:"https://kenney.nl/assets/furniture-kit",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true
    }),
    plant: Object.freeze({
      id:"cc0-office-plant",
      file:"plant-fern.glb",
      category:"plant",
      creator:"Isa Lousberg",
      sourcePack:"House Plants set via Poly Pizza",
      sourceUrl:"https://poly.pizza/bundle/House-Plants-set-Kpj32c7VmF",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true
    }),
    armchair: Object.freeze({
      id:"kaykit-armchair-pillows",
      file:"armchair-kyst.glb",
      category:"lounge",
      creator:"Kay Lousberg",
      sourcePack:"KayKit Furniture Bits 1.0",
      sourceUrl:"https://kaylousberg.itch.io/furniture-bits",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true
    }),
    meetingTable: Object.freeze({
      id:"kenney-meeting-table",
      file:"table-rove.glb",
      category:"table",
      creator:"Kenney",
      sourcePack:"Furniture Kit 2.0",
      sourceUrl:"https://kenney.nl/assets/furniture-kit",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true
    }),
    vase: Object.freeze({
      id:"cc0-vase",
      file:"decor-vase.glb",
      category:"decoration",
      creator:"CreativeTrio",
      sourcePack:"Household Props 001 via Poly Pizza",
      sourceUrl:"https://poly.pizza/bundle/Household-Props-001-KsNBhP96PT",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"essential"
    }),
    sofa: Object.freeze({
      id:"quaternius-sofa-liva",
      file:"sofa-liva.glb",
      category:"lounge",
      creator:"Quaternius",
      sourcePack:"Ultimate House Interior Pack via Poly Pizza",
      sourceUrl:"https://quaternius.com/packs/ultimatehomeinterior.html",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"essential"
    }),
    wardrobe: Object.freeze({
      id:"kenney-wardrobe-hald",
      file:"wardrobe-hald.glb",
      category:"storage",
      creator:"Kenney",
      sourcePack:"Furniture Kit 2.0",
      sourceUrl:"https://kenney.nl/assets/furniture-kit",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"essential"
    }),
    rug: Object.freeze({
      id:"kenney-rug-loop",
      file:"rug-loop.glb",
      category:"floor-decoration",
      creator:"Kenney",
      sourcePack:"Furniture Kit 2.0",
      sourceUrl:"https://kenney.nl/assets/furniture-kit",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    }),
    tableLamp: Object.freeze({
      id:"kenney-table-lamp-alva",
      file:"table-lamp-alva.glb",
      category:"lamp",
      creator:"Kenney",
      sourcePack:"Furniture Kit 2.0",
      sourceUrl:"https://kenney.nl/assets/furniture-kit",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    }),
    plantFig: Object.freeze({
      id:"cc0-plant-fig",
      file:"plant-fig.glb",
      category:"plant",
      creator:"Isa Lousberg",
      sourcePack:"House Plants set via Poly Pizza",
      sourceUrl:"https://poly.pizza/bundle/House-Plants-set-Kpj32c7VmF",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    }),
    plantPalm: Object.freeze({
      id:"quaternius-plant-palm",
      file:"plant-palm.glb",
      category:"plant",
      creator:"Quaternius",
      sourcePack:"Ultimate House Interior Pack via Poly Pizza",
      sourceUrl:"https://quaternius.com/packs/ultimatehomeinterior.html",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    }),
    decorBowl: Object.freeze({
      id:"cc0-decor-bowl",
      file:"decor-bowl.glb",
      category:"decoration",
      creator:"CreativeTrio",
      sourcePack:"Household Props 001 via Poly Pizza",
      sourceUrl:"https://poly.pizza/bundle/Household-Props-001-KsNBhP96PT",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    }),
    decorSculpture: Object.freeze({
      id:"cc0-decor-sculpture",
      file:"decor-sculpture.glb",
      category:"decoration",
      creator:"CreativeTrio",
      sourcePack:"Household Props 001 via Poly Pizza",
      sourceUrl:"https://poly.pizza/bundle/Household-Props-001-KsNBhP96PT",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    }),
    sideTable: Object.freeze({
      id:"kenney-side-table",
      file:"table-ake.glb",
      category:"table",
      creator:"Kenney",
      sourcePack:"Furniture Kit 2.0",
      sourceUrl:"https://kenney.nl/assets/furniture-kit",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    }),
    loungeChair: Object.freeze({
      id:"kaykit-lounge-chair",
      file:"chair-finn.glb",
      category:"chair",
      creator:"Kay Lousberg",
      sourcePack:"KayKit Furniture Bits 1.0",
      sourceUrl:"https://kaylousberg.itch.io/furniture-bits",
      license:"CC0-1.0",
      licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
      format:"glb",
      mobileSafe:true,
      priority:"decor"
    })
  });

  const registry=Object.freeze({
    mirrorRepo:MIRROR_REPO,
    mirrorCommit:MIRROR_COMMIT,
    localBase:LOCAL_BASE,
    cdnBase:CDN_BASE,
    rawBase:RAW_BASE,
    licensePolicy:"Only integrate assets whose source/license is explicitly recorded.",
    transport:"local_then_jsdelivr_then_rawgithub_commit_pinned",
    get(key){
      const item=ASSETS[key];
      if(!item) return null;
      return Object.freeze(Object.assign({},item,{url:LOCAL_BASE+item.file,fallbackUrl:CDN_BASE+item.file,urls:Object.freeze([LOCAL_BASE+item.file,CDN_BASE+item.file,RAW_BASE+item.file])}));
    },
    keys(){ return Object.keys(ASSETS); },
    all(){ return Object.keys(ASSETS).map(key=>this.get(key)); }
  });

  window.AKIRA_OFFICE_ASSET_REGISTRY=registry;
})();
