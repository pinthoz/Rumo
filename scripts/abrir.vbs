' Gerado por scripts/atalho.mjs: abre o Rumo local sem mostrar nenhuma janela.
Set fso = CreateObject("Scripting.FileSystemObject")
raiz = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = raiz
sh.Run "cmd /c node scripts\painel.mjs abrir", 0, False
