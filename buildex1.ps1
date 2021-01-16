Write-Output 'start build'
tsc  --module esnext --target esnext --outDir ./dist  ./src/examples/1/main.ts 
Write-Output "build end"