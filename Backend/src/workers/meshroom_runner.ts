// import { exec } from "child_process";
// import { promisify } from "util";
// import path from "path";
// import fs from "fs/promises";

// const execAsync = promisify(exec);

// interface MeshroomOptions {
//   inputDir: string;
//   outputDir: string;
// }

// /**
//  * Runs Meshroom pipeline on input photos and outputs GLB
//  */
// export async function runMeshroom({
//   inputDir,
//   outputDir,
// }: MeshroomOptions): Promise<string> {
//   await fs.mkdir(outputDir, { recursive: true });

//   const projectFile = path.join(outputDir, "project.mg");
//   const meshOutput = path.join(outputDir, "texturedMesh.obj"); // Meshroom default textured OBJ

//   console.log(`Running Meshroom: input=${inputDir}, output=${outputDir}`);

//   // Meshroom CLI command (basic photogrammetry pipeline)
//   const cmd = [
//     "meshroom_batch",
//     "--input",
//     inputDir,
//     "--output",
//     outputDir,
//     "--save",
//     projectFile,
//     // Optional: faster / lower quality for testing
//     "--cache",
//     "--forceCompute",
//     // '--pipeline', 'photogrammetry', // default
//   ].join(" ");

//   try {
//     const { stdout, stderr } = await execAsync(cmd, {
//       maxBuffer: 1024 * 1024 * 10, // 10MB log buffer
//     });

//     console.log("Meshroom stdout:", stdout.substring(0, 2000)); // truncate for logs
//     if (stderr) console.warn("Meshroom stderr:", stderr.substring(0, 2000));

//     // Check if OBJ was created
//     const objExists = await fs
//       .access(meshOutput)
//       .then(() => true)
//       .catch(() => false);
//     if (!objExists) {
//       throw new Error(
//         "Meshroom did not generate textured mesh (OBJ file missing)",
//       );
//     }

//     // Convert OBJ + MTL + textures → GLB using gltf-transform
//     const glbPath = path.join(outputDir, "model.glb");

//     console.log("Converting OBJ to GLB...");
//     await execAsync(
//       `gltf-transform obj2glb "${meshOutput}" "${glbPath}" --colors --normals --texcoords --draco`,
//     );

//     console.log(`GLB generated successfully: ${glbPath}`);

//     return glbPath;
//   } catch (err: any) {
//     console.error("Meshroom or conversion failed:", err.message);
//     // Optional: log full error
//     if (err.stdout) console.log("stdout:", err.stdout);
//     if (err.stderr) console.log("stderr:", err.stderr);
//     throw err;
//   }
// }
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

interface MeshroomOptions {
  inputDir: string;
  outputDir: string;
}

/**
 * Runs Meshroom pipeline on input photos and outputs GLB
 */
export async function runMeshroom({
  inputDir,
  outputDir,
}: MeshroomOptions): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  const projectFile = path.join(outputDir, "project.mg");
  const meshOutput = path.join(outputDir, "texturedMesh.obj");
  const glbPath = path.join(outputDir, "model.glb");

  const meshroomExe = process.env.MESHROOM_BATCH_PATH || "meshroom_batch";

  console.log(`Running Meshroom: input=${inputDir}, output=${outputDir}`);
  console.log(`Using Meshroom executable: ${meshroomExe}`);

  const cmd = [
    `"${meshroomExe}"`,
    "--input",
    `"${inputDir}"`,
    "--output",
    `"${outputDir}"`,
    "--save",
    `"${projectFile}"`,
    "--cache",
    `"${outputDir}"`,
    "--forceCompute",
  ].join(" ");

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 1024 * 1024 * 20,
    });

    console.log("Meshroom stdout:", stdout.substring(0, 2000));
    if (stderr) {
      console.warn("Meshroom stderr:", stderr.substring(0, 2000));
    }

    const objExists = await fs
      .access(meshOutput)
      .then(() => true)
      .catch(() => false);

    if (!objExists) {
      throw new Error(
        `Meshroom finished but OBJ file was not found at: ${meshOutput}`,
      );
    }

    console.log("Converting OBJ to GLB...");
    await execAsync(
      `gltf-transform obj2glb "${meshOutput}" "${glbPath}" --colors --normals --texcoords --draco`,
      {
        maxBuffer: 1024 * 1024 * 20,
      },
    );

    console.log(`GLB generated successfully: ${glbPath}`);
    return glbPath;
  } catch (err: any) {
    console.error("Meshroom or conversion failed:", err.message);
    if (err.stdout) console.log("stdout:", err.stdout);
    if (err.stderr) console.log("stderr:", err.stderr);
    throw err;
  }
}
