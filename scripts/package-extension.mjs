import { mkdir, rm, cp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const output=resolve("dist/twitch-extension");
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(resolve("public/twitch"),output,{recursive:true});
const zip=resolve("dist/pick-predict-twitch-extension.zip");
await rm(zip,{force:true});
const result=spawnSync("zip",["-qr",zip,"."],{cwd:output,stdio:"inherit"});
if(result.status!==0)throw new Error("Could not create Extension ZIP. Install the zip command and retry.");
console.log(zip);
