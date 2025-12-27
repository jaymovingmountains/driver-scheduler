import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const docxPath = path.join(process.cwd(), 'Driver_Subcontractor_Agreement-2.docx');
const outputPath = path.join(process.cwd(), 'shared', 'agreement-content.ts');

async function extractAgreement() {
  try {
    // Convert docx to HTML
    const result = await mammoth.convertToHtml({ path: docxPath });
    const html = result.value;
    
    // Clean up the HTML - remove excessive whitespace but keep structure
    const cleanedHtml = html
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .trim();
    
    // Create the TypeScript file with the agreement content
    const tsContent = `// Auto-generated from Driver_Subcontractor_Agreement-2.docx
// DO NOT EDIT MANUALLY

export const AGREEMENT_TITLE = "INDEPENDENT CONTRACTOR DRIVER SERVICES AGREEMENT";

export const AGREEMENT_HTML = \`${cleanedHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;

export const AGREEMENT_VERSION = "1.0";
export const AGREEMENT_EFFECTIVE_DATE = "${new Date().toISOString().split('T')[0]}";
`;

    fs.writeFileSync(outputPath, tsContent);
    console.log('Agreement content extracted successfully!');
    console.log(`Output: ${outputPath}`);
    console.log(`HTML length: ${cleanedHtml.length} characters`);
    
    // Also log any warnings from mammoth
    if (result.messages.length > 0) {
      console.log('Warnings:', result.messages);
    }
  } catch (error) {
    console.error('Error extracting agreement:', error);
    process.exit(1);
  }
}

extractAgreement();
