<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index) &gt; [@microsoft/api-extractor](./api-extractor.md) &gt; [IConfigCompiler](./api-extractor.iconfigcompiler.md)

## IConfigCompiler interface

Determines how the TypeScript compiler engine will be invoked by API Extractor.

<b>Signature:</b>

```typescript
export interface IConfigCompiler 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [overrideTsconfig](./api-extractor.iconfigcompiler.overridetsconfig.md) | <code>{}</code> | Provides a compiler configuration that will be used instead of reading the tsconfig.json file from disk. |
|  [skipLibCheck](./api-extractor.iconfigcompiler.skiplibcheck.md) | <code>boolean</code> | This option causes the compiler to be invoked with the <code>--skipLibCheck</code> option. |
|  [tsconfigFilePath](./api-extractor.iconfigcompiler.tsconfigfilepath.md) | <code>string</code> | Specifies the path to the tsconfig.json file to be used by API Extractor when analyzing the project. |

## Remarks

This is part of the [IConfigFile](./api-extractor.iconfigfile.md) structure.
