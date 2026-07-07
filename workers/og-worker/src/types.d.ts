declare module '*.ttf' {
  const data: ArrayBuffer
  export default data
}

declare module '*.png' {
  const data: ArrayBuffer
  export default data
}

declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
