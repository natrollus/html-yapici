#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs/promises';
import * as path from 'path';
import { JSDOM } from 'jsdom';

// Logları dosyaya yazan yardımcı fonksiyon
const logFile = fs.open('/Users/byram/Projects/claude/mcp/html-yapici/html-editor-mcp.log', 'a').then(file => file);

async function logToFile(message: string) {
  const file = await logFile;
  const timestamp = new Date().toISOString();
  await file.write(`${timestamp}: ${message}\n`);
}

// HTML elementi ekleme aracı
const HTML_ADD_ELEMENT_TOOL: Tool = {
  name: "html_add_element",
  description:
      "HTML dosyasına yeni bir element ekler. Örneğin buton, başlık, paragraf, div, vb. " +
      "Eklenen elementin özellikleri (stil, id, class) belirtilebilir.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "HTML dosyasının yolu (mutlak veya göreceli)"
      },
      element: {
        type: "string",
        description: "Eklenecek element (button, div, h1, p, vb.)"
      },
      content: {
        type: "string",
        description: "Element içeriği (metin)",
        default: ""
      },
      parentSelector: {
        type: "string",
        description: "Elementin ekleneceği parent elemanının CSS seçicisi (örn: #container, .content)",
        default: "body"
      },
      attributes: {
        type: "object",
        description: "Element için eklenecek nitelikler (id, class, style, vb.)",
        additionalProperties: true,
        default: {}
      },
      styles: {
        type: "object",
        description: "Element için eklenecek CSS stilleri",
        additionalProperties: true,
        default: {}
      }
    },
    required: ["file", "element"],
  },
};

// HTML elementi düzenleme aracı
const HTML_EDIT_ELEMENT_TOOL: Tool = {
  name: "html_edit_element",
  description:
      "HTML dosyasında mevcut bir elementi düzenler. Element içeriğini, niteliklerini " +
      "ve stillerini değiştirebilirsiniz.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "HTML dosyasının yolu (mutlak veya göreceli)"
      },
      selector: {
        type: "string",
        description: "Düzenlenecek elemanın CSS seçicisi (örn: #button1, .container, h1)"
      },
      content: {
        type: "string",
        description: "Yeni element içeriği (metin). Belirtilmezse içerik değişmez.",
        default: null
      },
      attributes: {
        type: "object",
        description: "Değiştirilecek veya eklenecek nitelikler (id, class, vb.)",
        additionalProperties: true,
        default: {}
      },
      styles: {
        type: "object",
        description: "Değiştirilecek veya eklenecek CSS stilleri",
        additionalProperties: true,
        default: {}
      },
      removeAttributes: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Kaldırılacak niteliklerin listesi",
        default: []
      }
    },
    required: ["file", "selector"],
  },
};

// HTML dosyası oluşturma aracı
const HTML_CREATE_FILE_TOOL: Tool = {
  name: "html_create_file",
  description:
      "Yeni bir HTML dosyası oluşturur. Temel HTML yapısını içeren bir şablon " +
      "ile başlayabilir ve başlık gibi özellikler ekleyebilirsiniz.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "Oluşturulacak HTML dosyasının yolu (mutlak veya göreceli)"
      },
      title: {
        type: "string",
        description: "Sayfa başlığı (title tag)",
        default: "Yeni Sayfa"
      },
      language: {
        type: "string",
        description: "Sayfa dili (html lang attribute)",
        default: "tr"
      },
      charset: {
        type: "string",
        description: "Karakter kodlaması",
        default: "UTF-8"
      },
      includeBootstrap: {
        type: "boolean",
        description: "Bootstrap CSS ve JS eklensin mi?",
        default: false
      },
      content: {
        type: "string",
        description: "Body içine eklenecek başlangıç içeriği (isteğe bağlı)",
        default: ""
      }
    },
    required: ["file"],
  },
};

// HTML dosyasını görüntüleme aracı
const HTML_VIEW_TOOL: Tool = {
  name: "html_view",
  description:
      "HTML dosyasının içeriğini görüntüler. Belirli bir elementi seçerek " +
      "sadece o elementi görüntüleyebilirsiniz.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "HTML dosyasının yolu (mutlak veya göreceli)"
      },
      selector: {
        type: "string",
        description: "Görüntülenecek elementin CSS seçicisi. Belirtilmezse tüm dosya görüntülenir.",
        default: null
      }
    },
    required: ["file"],
  },
};

// HTML elementi silme aracı
const HTML_DELETE_ELEMENT_TOOL: Tool = {
  name: "html_delete_element",
  description:
      "HTML dosyasından bir elementi siler.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "HTML dosyasının yolu (mutlak veya göreceli)"
      },
      selector: {
        type: "string",
        description: "Silinecek elementin CSS seçicisi"
      }
    },
    required: ["file", "selector"],
  },
};

// Server oluştur
const server = new Server(
    {
      name: "html-editor-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        //prompts: {},  // Prompts yeteneğini ekleyin
        //resources: {}
      },
    },
);

// Argüman tipi kontrol fonksiyonları
function isHtmlAddElementArgs(args: unknown): args is {
  file: string;
  element: string;
  content?: string;
  parentSelector?: string;
  attributes?: Record<string, string>;
  styles?: Record<string, string>;
} {
  return (
      typeof args === "object" &&
      args !== null &&
      "file" in args &&
      typeof (args as any).file === "string" &&
      "element" in args &&
      typeof (args as any).element === "string"
  );
}

function isHtmlEditElementArgs(args: unknown): args is {
  file: string;
  selector: string;
  content?: string | null;
  attributes?: Record<string, string>;
  styles?: Record<string, string>;
  removeAttributes?: string[];
} {
  return (
      typeof args === "object" &&
      args !== null &&
      "file" in args &&
      typeof (args as any).file === "string" &&
      "selector" in args &&
      typeof (args as any).selector === "string"
  );
}

function isHtmlCreateFileArgs(args: unknown): args is {
  file: string;
  title?: string;
  language?: string;
  charset?: string;
  includeBootstrap?: boolean;
  content?: string;
} {
  return (
      typeof args === "object" &&
      args !== null &&
      "file" in args &&
      typeof (args as any).file === "string"
  );
}

function isHtmlViewArgs(args: unknown): args is {
  file: string;
  selector?: string | null;
} {
  return (
      typeof args === "object" &&
      args !== null &&
      "file" in args &&
      typeof (args as any).file === "string"
  );
}

function isHtmlDeleteElementArgs(args: unknown): args is {
  file: string;
  selector: string;
} {
  return (
      typeof args === "object" &&
      args !== null &&
      "file" in args &&
      typeof (args as any).file === "string" &&
      "selector" in args &&
      typeof (args as any).selector === "string"
  );
}

// HTML dosyasını yükle ve DOM oluştur
async function loadHtmlFile(filePath: string): Promise<JSDOM> {
  try {
    // Dosyanın tam yolunu al
    const resolvedPath = path.resolve(filePath);
    await logToFile(`Dosya yükleniyor: ${resolvedPath}`);

    // Dosyanın varlığını kontrol et
    try {
      await fs.access(resolvedPath);
    } catch (error) {
      throw new Error(`Dosya bulunamadı: ${resolvedPath}`);
    }

    // Dosyayı oku
    const content = await fs.readFile(resolvedPath, 'utf-8');

    // JSDOM nesnesi oluştur
    return new JSDOM(content);
  } catch (error) {
    await logToFile(`Dosya yükleme hatası: ${error}`);
    throw error;
  }
}

// HTML dosyasını kaydet
async function saveHtmlFile(filePath: string, dom: JSDOM): Promise<void> {
  try {
    const resolvedPath = path.resolve(filePath);
    await logToFile(`Dosya kaydediliyor: ${resolvedPath}`);

    // DOM'dan HTML içeriğini al
    const content = dom.serialize();

    // Dosyayı kaydet
    await fs.writeFile(resolvedPath, content, 'utf-8');
  } catch (error) {
    await logToFile(`Dosya kaydetme hatası: ${error}`);
    throw error;
  }
}

// Element ekleme işlevi
async function addHtmlElement(
    filePath: string,
    elementType: string,
    content: string = "",
    parentSelector: string = "body",
    attributes: Record<string, string> = {},
    styles: Record<string, string> = {}
): Promise<string> {
  try {
    // HTML dosyasını yükle
    const dom = await loadHtmlFile(filePath);
    const document = dom.window.document;

    // Parent elementi bul
    const parent = document.querySelector(parentSelector);
    if (!parent) {
      throw new Error(`Belirtilen parent element bulunamadı: ${parentSelector}`);
    }

    // Yeni element oluştur
    const newElement = document.createElement(elementType);

    // İçerik ekle
    if (content) {
      newElement.textContent = content;
    }

    // Nitelikleri ekle
    Object.entries(attributes).forEach(([key, value]) => {
      newElement.setAttribute(key, value);
    });

    // Stilleri ekle
    if (Object.keys(styles).length > 0) {
      let styleString = "";
      Object.entries(styles).forEach(([key, value]) => {
        // CSS özellik adını kebab-case'e dönüştür (örn: backgroundColor -> background-color)
        const cssProperty = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        styleString += `${cssProperty}: ${value}; `;
      });
      newElement.setAttribute("style", styleString);
    }

    // Elementi parent'a ekle
    parent.appendChild(newElement);

    // Dosyayı kaydet
    await saveHtmlFile(filePath, dom);

    return `"${elementType}" elementi "${parentSelector}" içerisine başarıyla eklendi.`;
  } catch (error) {
    await logToFile(`Element ekleme hatası: ${error}`);
    throw error;
  }
}

// Element düzenleme işlevi
async function editHtmlElement(
    filePath: string,
    selector: string,
    content: string | null = null,
    attributes: Record<string, string> = {},
    styles: Record<string, string> = {},
    removeAttributes: string[] = []
): Promise<string> {
  try {
    // HTML dosyasını yükle
    const dom = await loadHtmlFile(filePath);
    const document = dom.window.document;

    // Elementi bul
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Belirtilen element bulunamadı: ${selector}`);
    }

    // İçeriği değiştir
    if (content !== null) {
      element.textContent = content;
    }

    // Nitelikleri ekle veya değiştir
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    // Nitelikleri kaldır
    removeAttributes.forEach(attr => {
      element.removeAttribute(attr);
    });

    // Stilleri değiştir
    if (Object.keys(styles).length > 0) {
      let currentStyle = element.getAttribute("style") || "";

      // Mevcut stilleri objeye dönüştür
      const currentStyles: Record<string, string> = {};
      currentStyle.split(";").forEach(style => {
        const [property, value] = style.split(":").map(s => s.trim());
        if (property && value) {
          currentStyles[property] = value;
        }
      });

      // Yeni stilleri ekle veya değiştir
      Object.entries(styles).forEach(([key, value]) => {
        // CSS özellik adını kebab-case'e dönüştür
        const cssProperty = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        currentStyles[cssProperty] = value;
      });

      // Stilleri string'e dönüştür
      let styleString = "";
      Object.entries(currentStyles).forEach(([property, value]) => {
        styleString += `${property}: ${value}; `;
      });

      element.setAttribute("style", styleString);
    }

    // Dosyayı kaydet
    await saveHtmlFile(filePath, dom);

    return `"${selector}" elementi başarıyla düzenlendi.`;
  } catch (error) {
    await logToFile(`Element düzenleme hatası: ${error}`);
    throw error;
  }
}

// HTML dosyası oluşturma işlevi
async function createHtmlFile(
    filePath: string,
    title: string = "Yeni Sayfa",
    language: string = "tr",
    charset: string = "UTF-8",
    includeBootstrap: boolean = false,
    content: string = ""
): Promise<string> {
  try {
    const resolvedPath = path.resolve(filePath);
    await logToFile(`Yeni HTML dosyası oluşturuluyor: ${resolvedPath}`);

    // Dosyanın var olup olmadığını kontrol et
    try {
      await fs.access(resolvedPath);
      throw new Error(`Dosya zaten mevcut: ${resolvedPath}`);
    } catch (error) {
      // Dosya mevcut değilse devam et (bu beklenen durum)

    }

    // Bootstrap bağlantıları
    const bootstrapCss = includeBootstrap ?
        '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">' : '';
    const bootstrapJs = includeBootstrap ?
        '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>' : '';

    // HTML şablonu oluştur
    const htmlTemplate = `<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="${charset}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${bootstrapCss}
</head>
<body>
    ${content}
    ${bootstrapJs}
</body>
</html>`;

    // Dosyayı oluştur
    await fs.writeFile(resolvedPath, htmlTemplate, 'utf-8');

    return `HTML dosyası başarıyla oluşturuldu: ${resolvedPath}`;
  } catch (error) {
    await logToFile(`Dosya oluşturma hatası: ${error}`);
    throw error;
  }
}

// HTML dosyasını görüntüleme işlevi
async function viewHtmlFile(
    filePath: string,
    selector: string | null = null
): Promise<string> {
  try {
    // HTML dosyasını yükle
    const dom = await loadHtmlFile(filePath);
    const document = dom.window.document;

    // Belirli bir element seçilmişse
    if (selector) {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Belirtilen element bulunamadı: ${selector}`);
      }
      return element.outerHTML;
    }

    // Tüm dosyayı görüntüle
    return dom.serialize();
  } catch (error) {
    await logToFile(`Dosya görüntüleme hatası: ${error}`);
    throw error;
  }
}

// HTML elementi silme işlevi
async function deleteHtmlElement(
    filePath: string,
    selector: string
): Promise<string> {
  try {
    // HTML dosyasını yükle
    const dom = await loadHtmlFile(filePath);
    const document = dom.window.document;

    // Elementi bul
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Belirtilen element bulunamadı: ${selector}`);
    }

    // Elementi sil
    element.parentNode?.removeChild(element);

    // Dosyayı kaydet
    await saveHtmlFile(filePath, dom);

    return `"${selector}" elementi başarıyla silindi.`;
  } catch (error) {
    await logToFile(`Element silme hatası: ${error}`);
    throw error;
  }
}

// Araçları listele
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    HTML_ADD_ELEMENT_TOOL,
    HTML_EDIT_ELEMENT_TOOL,
    HTML_CREATE_FILE_TOOL,
    HTML_VIEW_TOOL,
    HTML_DELETE_ELEMENT_TOOL
  ],
}));

// Araç çağırma işleyicisi
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await logToFile(`MCP İSTEK: ${JSON.stringify(request, null, 2)}`);

  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("Argümanlar sağlanmadı");
    }

    switch (name) {
      case "html_add_element": {
        if (!isHtmlAddElementArgs(args)) {
          throw new Error("html_add_element için geçersiz argümanlar");
        }
        const { file, element, content = "", parentSelector = "body", attributes = {}, styles = {} } = args;
        const result = await addHtmlElement(file, element, content, parentSelector, attributes, styles);
        await logToFile(`Element ekleme sonucu: ${result}`);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "html_edit_element": {
        if (!isHtmlEditElementArgs(args)) {
          throw new Error("html_edit_element için geçersiz argümanlar");
        }
        const { file, selector, content = null, attributes = {}, styles = {}, removeAttributes = [] } = args;
        const result = await editHtmlElement(file, selector, content, attributes, styles, removeAttributes);
        await logToFile(`Element düzenleme sonucu: ${result}`);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "html_create_file": {
        if (!isHtmlCreateFileArgs(args)) {
          throw new Error("html_create_file için geçersiz argümanlar");
        }
        const { file, title = "Yeni Sayfa", language = "tr", charset = "UTF-8", includeBootstrap = false, content = "" } = args;
        const result = await createHtmlFile(file, title, language, charset, includeBootstrap, content);
        await logToFile(`Dosya oluşturma sonucu: ${result}`);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "html_view": {
        if (!isHtmlViewArgs(args)) {
          throw new Error("html_view için geçersiz argümanlar");
        }
        const { file, selector = null } = args;
        const result = await viewHtmlFile(file, selector);
        await logToFile(`Dosya görüntüleme: ${file} (${result.length} karakter)`);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "html_delete_element": {
        if (!isHtmlDeleteElementArgs(args)) {
          throw new Error("html_delete_element için geçersiz argümanlar");
        }
        const { file, selector } = args;
        const result = await deleteHtmlElement(file, selector);
        await logToFile(`Element silme sonucu: ${result}`);
        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Bilinmeyen araç: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToFile(`HATA: ${errorMessage}`);
    return {
      content: [
        {
          type: "text",
          text: `Hata: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Şablon ve kaynak listesi istekleri için boş yanıtlar
/*server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: []
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: []
}));*/

// Sunucuyu çalıştır
async function runServer() {
  try {
    await logToFile("HTML Düzenleme MCP Sunucusu başlatılıyor");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    await logToFile("Sunucu stdio üzerinde çalışıyor");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToFile(`Sunucu başlatma hatası: ${errorMessage}`);
    console.error("Sunucu başlatma hatası:", errorMessage);
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error("Kritik hata:", error);
  process.exit(1);
});
