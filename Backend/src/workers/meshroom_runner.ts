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
  // Resolve all paths to absolute to avoid mixed-slash issues on Windows
  const absInputDir = path.resolve(inputDir);
  const absOutputDir = path.resolve(outputDir);
  const absCacheDir = path.resolve(outputDir, "cache");

  await fs.mkdir(absOutputDir, { recursive: true });
  await fs.mkdir(absCacheDir, { recursive: true });

  const projectFile = path.join(absOutputDir, "project.mg");
  const meshOutput = path.join(absOutputDir, "texturedMesh.obj");
  const glbPath = path.join(absOutputDir, "model.glb");

  const meshroomExe = process.env.MESHROOM_BATCH_PATH || "meshroom_batch";

  console.log(`Running Meshroom: input=${absInputDir}, output=${absOutputDir}`);
  console.log(`Using Meshroom executable: ${meshroomExe}`);

  const cmd = [
    `"${meshroomExe}"`,
    "--input",
    `"${absInputDir}"`,
    "--output",
    `"${absOutputDir}"`,
    "--save",
    `"${projectFile}"`,
    "--cache",
    `"${absCacheDir}"`,
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

    // ====== START OF EXR TO JPG CONVERSION ======
    // After Meshroom generates texturedMesh.obj and texture_1001.exr
    let textureExr = path.join(absOutputDir, "texture_1001.exr");
    let textureJpg = path.join(absOutputDir, "texture_1001.jpg");

    // Check if EXR exists; if not, try alternative naming (texture_0.exr)
    let exrExists = await fs
      .access(textureExr)
      .then(() => true)
      .catch(() => false);
    if (!exrExists) {
      const altExr = path.join(absOutputDir, "texture_0.exr");
      if (
        await fs
          .access(altExr)
          .then(() => true)
          .catch(() => false)
      ) {
        textureExr = altExr;
        textureJpg = path.join(absOutputDir, "texture_0.jpg");
        exrExists = true;
      }
    }

    if (exrExists) {
      try {
        // Convert EXR to JPG using magick (ImageMagick 7)
        await execAsync(`magick "${textureExr}" "${textureJpg}"`);
        console.log("EXR converted to JPG successfully");

        // Update the MTL file to reference the new JPG texture
        const mtlPath = path.join(absOutputDir, "texturedMesh.mtl");
        let mtlContent = await fs.readFile(mtlPath, "utf8");
        mtlContent = mtlContent.replace(
          /texture_\d+\.exr/g,
          path.basename(textureJpg),
        );
        await fs.writeFile(mtlPath, mtlContent);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn(
          "EXR conversion failed, model may lack textures:",
          errorMessage,
        );
      }
    } else {
      console.warn(
        "No EXR texture file found, continuing without texture conversion",
      );
    }
    // ====== END OF EXR CONVERSION ======

    console.log("Converting OBJ to GLB...");
    await execAsync(
      `npx obj2gltf -i "${meshOutput}" -o "${glbPath}" --normals --texcoords --materials --embed`,
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
