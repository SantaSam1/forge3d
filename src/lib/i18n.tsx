import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'ru' | 'en';

const translations = {
  en: {
    // Nav
    appName: '3D-Prin',
    nav: {
      studio: 'Studio',
      library: 'Library',
      pricing: 'Pricing',
      docs: 'Docs',
      signIn: 'Sign In',
      signUp: 'Sign Up',
    },
    // Hero
    hero: {
      badge: 'AI-Powered 3D Design',
      title: 'Design 3D Models',
      titleAccent: 'Instantly with AI',
      subtitle: 'Generate, view, convert and export 3D models. Works with AR/VR. Free for everyone — from beginners to professionals.',
      ctaPrimary: 'Open Studio',
      ctaSecondary: 'Browse Library',
      features: ['Text-to-3D generation', 'AR & VR ready', 'Multi-format export', 'No install required'],
    },
    // Studio
    studio: {
      title: 'Studio',
      tabs: {
        generate: 'Generate',
        upload: 'Upload',
        library: 'Library',
        convert: 'Convert',
      },
      generate: {
        label: 'Describe your 3D model',
        placeholder: 'e.g. a low-poly futuristic spaceship with glowing engines...',
        button: 'Generate Model',
        generating: 'Generating...',
        hint: 'Powered by Replicate AI — Shap-E model',
      },
      upload: {
        label: 'Upload a 3D file',
        hint: 'Supported: GLB, OBJ, GLTF, STL, FBX, USDZ (max 50MB)',
        button: 'Choose File',
        draghint: 'or drag & drop here',
      },
      convert: {
        label: 'Convert format',
        from: 'From',
        to: 'To',
        button: 'Convert',
        converting: 'Converting...',
      },
      viewer: {
        empty: 'No model loaded',
        emptyHint: 'Generate, upload, or pick from the library',
        loading: 'Loading model...',
        rotate: 'Click & drag to rotate',
        zoom: 'Scroll to zoom',
      },
      export: {
        title: 'Export',
        formats: 'Formats',
        download: 'Download',
        copy: 'Copy link',
        copied: 'Copied!',
        ar: 'View in AR',
        vr: 'View in VR',
      },
    },
    // Library
    library: {
      title: 'Model Library',
      search: 'Search models...',
      categories: {
        all: 'All',
        primitives: 'Primitives',
        nature: 'Nature',
        characters: 'Characters',
        furniture: 'Furniture',
        art: 'Art',
        misc: 'Misc',
      },
      use: 'Use in Studio',
      downloads: 'downloads',
    },
    // Features section
    features: {
      title: 'Everything you need for 3D design',
      subtitle: 'Professional tools, zero complexity.',
      items: [
        { title: 'Text-to-3D AI', desc: 'Describe anything in plain language and get a ready 3D model in seconds.' },
        { title: 'AR / VR Ready', desc: 'Preview your models in augmented and virtual reality directly from the browser.' },
        { title: 'Multi-format Export', desc: 'Export to glTF, OBJ, USDZ, STL and more — compatible with all major 3D printers and engines.' },
        { title: 'Instant Conversion', desc: 'Convert between 3D formats on the fly with our server-side converter.' },
        { title: 'Browser Viewer', desc: 'Full Three.js powered viewer with lighting, materials and orbit controls built in.' },
        { title: 'Free Plan', desc: 'Core features are free forever. No credit card required to start creating.' },
      ],
    },
    // Pricing
    pricing: {
      title: 'Simple, transparent pricing',
      subtitle: 'Start free. Upgrade when you need more.',
      free: {
        name: 'Free',
        price: '$0',
        period: '/month',
        features: ['10 AI generations/month', '3D viewer', 'Format conversion', 'Library access', 'GLB / OBJ export'],
        cta: 'Get started',
      },
      pro: {
        name: 'Pro',
        price: '$19',
        period: '/month',
        badge: 'Most popular',
        features: ['Unlimited AI generations', 'AR / VR preview', 'All export formats', 'Priority rendering', 'API access'],
        cta: 'Start Pro',
      },
      team: {
        name: 'Team',
        price: '$49',
        period: '/month',
        features: ['Everything in Pro', 'Up to 10 seats', 'Shared library', 'Custom textures', 'Dedicated support'],
        cta: 'Contact us',
      },
    },
    // Footer
    footer: {
      tagline: 'The fastest way to bring 3D ideas to life.',
      product: 'Product',
      company: 'Company',
      links: {
        studio: 'Studio',
        library: 'Library',
        api: 'API',
        pricing: 'Pricing',
        about: 'About',
        blog: 'Blog',
        privacy: 'Privacy',
        terms: 'Terms',
      },
      copy: '© 2026 3D-Prin. All rights reserved.',
    },
    // Toast / messages
    messages: {
      generationStarted: 'Generating your model...',
      generationSuccess: 'Model generated successfully!',
      generationFailed: 'Generation failed. Please try again.',
      uploadSuccess: 'File uploaded successfully!',
      uploadFailed: 'Upload failed. Check file type and size.',
      convertSuccess: 'Conversion complete!',
      convertFailed: 'Conversion failed.',
      apiKeyMissing: 'Replicate API key not configured.',
    },
  },
  ru: {
    appName: '3D-Prin',
    nav: {
      studio: 'Студия',
      library: 'Библиотека',
      pricing: 'Цены',
      docs: 'Документация',
      signIn: 'Войти',
      signUp: 'Регистрация',
    },
    hero: {
      badge: 'ИИ-генерация 3D-моделей',
      title: 'Создавай 3D-модели',
      titleAccent: 'мгновенно с ИИ',
      subtitle: 'Генерируй, просматривай, конвертируй и экспортируй 3D-модели. Поддержка AR и VR. Бесплатно для всех — от новичков до профессионалов.',
      ctaPrimary: 'Открыть студию',
      ctaSecondary: 'Библиотека моделей',
      features: ['Генерация по тексту', 'AR и VR поддержка', 'Экспорт в разных форматах', 'Без установки'],
    },
    studio: {
      title: 'Студия',
      tabs: {
        generate: 'Генерация',
        upload: 'Загрузить',
        library: 'Библиотека',
        convert: 'Конвертация',
      },
      generate: {
        label: 'Опишите вашу 3D-модель',
        placeholder: 'например, низкополигональный футуристический космический корабль...',
        button: 'Создать модель',
        generating: 'Генерация...',
        hint: 'На основе Replicate AI — модель Shap-E',
      },
      upload: {
        label: 'Загрузить 3D-файл',
        hint: 'Поддерживается: GLB, OBJ, GLTF, STL, FBX, USDZ (макс. 50 МБ)',
        button: 'Выбрать файл',
        draghint: 'или перетащите сюда',
      },
      convert: {
        label: 'Конвертировать формат',
        from: 'Из',
        to: 'В',
        button: 'Конвертировать',
        converting: 'Конвертация...',
      },
      viewer: {
        empty: 'Модель не загружена',
        emptyHint: 'Создайте, загрузите или выберите из библиотеки',
        loading: 'Загрузка модели...',
        rotate: 'Нажмите и перетащите для вращения',
        zoom: 'Прокрутите для масштабирования',
      },
      export: {
        title: 'Экспорт',
        formats: 'Форматы',
        download: 'Скачать',
        copy: 'Скопировать ссылку',
        copied: 'Скопировано!',
        ar: 'Открыть в AR',
        vr: 'Открыть в VR',
      },
    },
    library: {
      title: 'Библиотека моделей',
      search: 'Поиск моделей...',
      categories: {
        all: 'Все',
        primitives: 'Примитивы',
        nature: 'Природа',
        characters: 'Персонажи',
        furniture: 'Мебель',
        art: 'Арт',
        misc: 'Разное',
      },
      use: 'Открыть в студии',
      downloads: 'загрузок',
    },
    features: {
      title: 'Всё для 3D-дизайна',
      subtitle: 'Профессиональные инструменты без сложности.',
      items: [
        { title: 'Текст в 3D', desc: 'Опишите что угодно простыми словами — получите готовую 3D-модель за секунды.' },
        { title: 'AR / VR поддержка', desc: 'Просматривайте модели в дополненной и виртуальной реальности прямо из браузера.' },
        { title: 'Экспорт в разных форматах', desc: 'Экспорт в glTF, OBJ, USDZ, STL и другие — совместимо с 3D-принтерами и движками.' },
        { title: 'Мгновенная конвертация', desc: 'Конвертируйте между форматами на лету с помощью серверного конвертера.' },
        { title: 'Просмотр в браузере', desc: 'Полноценный просмотрщик на Three.js с освещением, материалами и управлением орбитой.' },
        { title: 'Бесплатный план', desc: 'Основные функции бесплатны навсегда. Карта не нужна для начала работы.' },
      ],
    },
    pricing: {
      title: 'Простые и прозрачные цены',
      subtitle: 'Начни бесплатно. Переходи на Pro когда нужно больше.',
      free: {
        name: 'Бесплатно',
        price: '₽0',
        period: '/месяц',
        features: ['10 генераций ИИ/месяц', '3D-просмотрщик', 'Конвертация форматов', 'Доступ к библиотеке', 'Экспорт GLB / OBJ'],
        cta: 'Начать',
      },
      pro: {
        name: 'Pro',
        price: '₽1 490',
        period: '/месяц',
        badge: 'Популярный',
        features: ['Безлимитные генерации', 'AR / VR-превью', 'Все форматы экспорта', 'Приоритетный рендеринг', 'Доступ к API'],
        cta: 'Начать Pro',
      },
      team: {
        name: 'Команда',
        price: '₽3 990',
        period: '/месяц',
        features: ['Всё из Pro', 'До 10 участников', 'Общая библиотека', 'Пользовательские текстуры', 'Приоритетная поддержка'],
        cta: 'Написать нам',
      },
    },
    footer: {
      tagline: 'Самый быстрый способ воплотить 3D-идеи в жизнь.',
      product: 'Продукт',
      company: 'Компания',
      links: {
        studio: 'Студия',
        library: 'Библиотека',
        api: 'API',
        pricing: 'Цены',
        about: 'О нас',
        blog: 'Блог',
        privacy: 'Конфиденциальность',
        terms: 'Условия',
      },
      copy: '© 2026 3D-Prin. Все права защищены.',
    },
    messages: {
      generationStarted: 'Генерация модели...',
      generationSuccess: 'Модель успешно создана!',
      generationFailed: 'Ошибка генерации. Попробуйте ещё раз.',
      uploadSuccess: 'Файл успешно загружен!',
      uploadFailed: 'Ошибка загрузки. Проверьте тип и размер файла.',
      convertSuccess: 'Конвертация завершена!',
      convertFailed: 'Ошибка конвертации.',
      apiKeyMissing: 'Replicate API ключ не настроен.',
    },
  },
};

type Translations = typeof translations.en;

interface LangContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangCtx = createContext<LangContext | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('forma3d_lang');
    if (saved === 'ru' || saved === 'en') return saved;
    return navigator.language.startsWith('ru') ? 'ru' : 'en';
  });

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('forma3d_lang', l);
  };

  return (
    <LangCtx.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
