const fs = require('fs').promises;
const path = require('path');

/**
 * Build script to copy necessary files to distribution directory
 * @returns {Promise<void>} 
 */
async function build() {
  try {
    // Read and parse tsconfig.json
    const tsConfigPath = path.join(__dirname, '..', 'tsconfig.json');
    const tsConfigContent = await fs.readFile(tsConfigPath, 'utf8');
    const tsConfig = JSON.parse(tsConfigContent);

    // Get output directory from tsconfig or use default
    const outDir = tsConfig.compilerOptions?.outDir || 'dist';
    const outDirPath = path.join(__dirname, '..', outDir);

    // Ensure output directory exists
    await fs.mkdir(outDirPath, { recursive: true });

    // Files/directories to copy
    const copyPaths = [
      {
        src: path.join(__dirname, '..', 'src', 'server', 'public'),
        dest: path.join(outDirPath, 'server', 'public'),
        name: 'public directory'
      },
      {
        src: path.join(__dirname, '..', 'src', 'server', 'views'), 
        dest: path.join(outDirPath, 'server', 'views'),
        name: 'views directory'
      }
    ];

    // Copy each path
    for (const { src, dest, name } of copyPaths) {
      await fs.cp(src, dest, { recursive: true });
      console.log(`✓ Copied ${name} to ${outDir}`);
    }

    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
