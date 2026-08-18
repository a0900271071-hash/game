import React from 'react';
import { X, Box, Code, Download, FileCode, Sparkles, CheckCircle2 } from 'lucide-react';

interface ModelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelImportModal: React.FC<ModelImportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0d0c] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] text-slate-100 p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-400 shadow-md">
              <Box className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                如何匯入外部寫實 3D 角色模型 (.glb / .gltf / .fbx)
              </h2>
              <p className="text-xs text-slate-400">完整教學指南與 Three.js GLTFLoader / FBXLoader 範例程式碼</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/50 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Banner */}
        <div className="bg-gradient-to-r from-cyan-950/60 to-blue-950/60 p-4 rounded-xl border border-cyan-500/30 text-xs text-cyan-200 leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-black text-sm text-cyan-300">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>寫實 3D 模型匯入說明</span>
          </div>
          <p>
            本遊戲專案支援直接透過 Three.js 的 <code className="px-1.5 py-0.5 bg-slate-900 rounded text-cyan-300 font-mono">GLTFLoader</code> 載入由 Blender、Maya 或 Sketchfab 下載的標準 <code className="px-1.5 py-0.5 bg-slate-900 rounded text-amber-300 font-mono">.glb</code> / <code className="px-1.5 py-0.5 bg-slate-900 rounded text-amber-300 font-mono">.gltf</code> 寫實模型。
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>步驟 1：存放模型檔案</span>
          </h3>
          <div className="bg-[#050706] p-4 rounded-xl border border-white/10 text-xs text-slate-300 space-y-2">
            <p>將您的寫實角色模型檔案（如 <code className="text-amber-300 font-mono">jack.glb</code> 或 <code className="text-amber-300 font-mono">kento.glb</code>）放入專案的 public 目錄：</p>
            <pre className="bg-slate-950 p-3 rounded-lg border border-white/5 font-mono text-[11px] text-emerald-400">
{`/public/
  ├── models/
  │   ├── jack.glb       <-- 傑克·米勒寫實 3D 模型
  │   ├── kento.glb      <-- 佐藤健人寫實 3D 模型
  │   ├── erik.glb       <-- 艾瑞克寫實 3D 模型
  │   └── gourmet.glb    <-- 老饕寫實 3D 模型`}
            </pre>
          </div>

          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            <span>步驟 2：使用 Three.js GLTFLoader 載入模型</span>
          </h3>
          <div className="bg-[#050706] p-4 rounded-xl border border-white/10 text-xs text-slate-300 space-y-2">
            <p>在 <code className="text-cyan-300 font-mono">src/game/createCharacterMesh.ts</code> 中加入如下範例程式碼：</p>
            <pre className="bg-slate-950 p-3 rounded-lg border border-white/5 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

/**
 * 試圖從 /public/models/ 載入自訂寫實 .glb 檔案
 */
export function loadCustom3DModel(modelName: string, onLoaded: (mesh: THREE.Group) => void) {
  gltfLoader.load(
    \`/models/\${modelName}.glb\`,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // 調整身形比例 (例如 180cm)
      model.scale.set(1.0, 1.0, 1.0);
      onLoaded(model);
    },
    undefined,
    (error) => {
      console.log('未檢測到自訂 .glb 模型，使用備用 2D 立繪卡牌呈現');
    }
  );
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg"
          >
            理解並關閉
          </button>
        </div>

      </div>
    </div>
  );
};
