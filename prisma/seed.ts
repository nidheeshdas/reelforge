import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const publicTemplatePublishedAt = new Date('2024-01-15T12:00:00.000Z');

type SeedUser = {
  email: string;
  name: string;
  password: string;
  credits: number;
  isCreator?: boolean;
};

type SeedTemplate = {
  title: string;
  description: string;
  category: 'ads' | 'testimonials' | 'memes' | 'artistic';
  tags: string[];
  vidscript: string;
  placeholders: Prisma.JsonArray;
  defaultValues: Prisma.JsonObject;
  downloads: number;
  ratingAvg: number;
  thumbnailUrl?: string;
};

const seedUsers: SeedUser[] = [
  {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
    credits: 10,
  },
  {
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'admin123',
    credits: 100,
    isCreator: true,
  },
  {
    email: 'demo@example.com',
    name: 'Demo User',
    password: 'demo123',
    credits: 5,
  },
];

const starterTemplates: SeedTemplate[] = [
  {
    title: 'Neighborhood Coffee Launch',
    description: 'A vertical launch spot for cafés, bakeries, and neighborhood food brands with a headline, offer, and closing CTA.',
    category: 'ads',
    tags: ['free', 'ad', 'food-and-drink', 'launch', 'local-business', 'vertical-video'],
    vidscript: `# Neighborhood Coffee Launch
input hero_video = {{video1}}
input music = {{music | "upbeat-cafe.mp3"}}

[0s - {{duration | 15}}s] = hero_video.Trim(0, {{duration | 15}})
[0s - end] = filter "{{effect | warm}}", intensity: {{effect_intensity | 0.35}}
[0s - end] = audio music, volume: {{music_volume | 0.65}}, fade_out: 2s

[0.5s - 3s] = text "{{brand_name | North Roast}}", style: title, position: top-left
[3s - 7s] = text "{{headline | Brewed for better mornings}}", style: subtitle, position: center
[7s - 11s] = text "{{offer | Opening week: free pastry with any latte}}", style: caption, position: bottom-center
[11s - end] = text "{{cta | Visit today}}", style: title, position: bottom-right

output to "neighborhood-coffee-launch.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Hero product video',
        required: true,
        group: 'Media',
        helpText: 'Use a close-up pour, storefront clip, or menu reveal.',
        accept: ['video/mp4', 'video/quicktime'],
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Background music',
        required: false,
        group: 'Media',
        default: 'upbeat-cafe.mp3',
        helpText: 'Light, upbeat audio works best for local shop promos.',
      },
      {
        name: 'brand_name',
        type: 'text',
        label: 'Brand name',
        required: true,
        group: 'Copy',
        default: 'North Roast',
        maxLength: 28,
      },
      {
        name: 'headline',
        type: 'text',
        label: 'Headline',
        required: true,
        group: 'Copy',
        default: 'Brewed for better mornings',
        maxLength: 52,
      },
      {
        name: 'offer',
        type: 'textarea',
        label: 'Offer',
        required: true,
        group: 'Copy',
        default: 'Opening week: free pastry with any latte',
        maxLength: 72,
      },
      {
        name: 'cta',
        type: 'text',
        label: 'Call to action',
        required: true,
        group: 'Copy',
        default: 'Visit today',
        maxLength: 24,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Color treatment',
        required: true,
        group: 'Style',
        default: 'warm',
        options: ['warm', 'contrast', 'vintage', 'none'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.35,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.65,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Clip duration',
        required: true,
        group: 'Timing',
        default: 15,
        min: 8,
        max: 30,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'coffee-pour.mp4',
      music: 'upbeat-cafe.mp3',
      brand_name: 'North Roast',
      headline: 'Brewed for better mornings',
      offer: 'Opening week: free pastry with any latte',
      cta: 'Visit today',
      effect: 'warm',
      effect_intensity: 0.35,
      music_volume: 0.65,
      duration: 15,
      output: {
        filename: 'neighborhood-coffee-launch.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 184,
    ratingAvg: 4.8,
  },
  {
    title: 'Flash Sale Product Drop',
    description: 'A punchy ecommerce promo for limited-time discounts, product drops, and feature-led mobile ads.',
    category: 'ads',
    tags: ['free', 'ad', 'ecommerce', 'flash-sale', 'product-drop', 'ugc-style'],
    vidscript: `# Flash Sale Product Drop
input product_video = {{video1}}
input detail_video = {{video2}}
input music = {{music | "hype-drop.mp3"}}

[0s - {{duration | 12}}s] = product_video.Trim(0, {{duration | 12}})
[4s - {{duration | 12}}s] = detail_video.Trim(0, {{detail_trim | 8}})
[0s - end] = filter "{{effect | contrast}}", intensity: {{effect_intensity | 0.45}}
[0s - end] = audio music, volume: {{music_volume | 0.75}}, fade_out: 1.5s

[0.2s - 2.4s] = text "{{headline | 48-hour drop}}", style: title, position: center
[2.4s - 6.6s] = text "{{product_name | Studio Light Kit}}", style: subtitle, position: top-left
[6.6s - 9.6s] = text "{{offer | Save 25% before midnight}}", style: caption, position: bottom-center
[9.6s - end] = text "{{cta | Tap to shop now}}", style: title, position: bottom-right

output to "flash-sale-product-drop.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Primary product clip',
        required: true,
        group: 'Media',
        helpText: 'Lead with the hero angle or packaging reveal.',
      },
      {
        name: 'video2',
        type: 'video',
        label: 'Detail clip',
        required: true,
        group: 'Media',
        helpText: 'Add a secondary clip for texture or feature callouts.',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Background music',
        required: false,
        group: 'Media',
        default: 'hype-drop.mp3',
      },
      {
        name: 'headline',
        type: 'text',
        label: 'Hook line',
        required: true,
        group: 'Copy',
        default: '48-hour drop',
        maxLength: 32,
      },
      {
        name: 'product_name',
        type: 'text',
        label: 'Product name',
        required: true,
        group: 'Copy',
        default: 'Studio Light Kit',
        maxLength: 36,
      },
      {
        name: 'offer',
        type: 'text',
        label: 'Offer message',
        required: true,
        group: 'Copy',
        default: 'Save 25% before midnight',
        maxLength: 48,
      },
      {
        name: 'cta',
        type: 'text',
        label: 'CTA',
        required: true,
        group: 'Copy',
        default: 'Tap to shop now',
        maxLength: 28,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'contrast',
        options: ['contrast', 'warm', 'monochrome', 'none'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.45,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.75,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Main cut duration',
        required: true,
        group: 'Timing',
        default: 12,
        min: 8,
        max: 20,
        step: 1,
        unit: 'seconds',
      },
      {
        name: 'detail_trim',
        type: 'number',
        label: 'Detail clip trim',
        required: true,
        group: 'Timing',
        default: 8,
        min: 4,
        max: 12,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'product-hero.mp4',
      video2: 'product-detail.mp4',
      music: 'hype-drop.mp3',
      headline: '48-hour drop',
      product_name: 'Studio Light Kit',
      offer: 'Save 25% before midnight',
      cta: 'Tap to shop now',
      effect: 'contrast',
      effect_intensity: 0.45,
      music_volume: 0.75,
      duration: 12,
      detail_trim: 8,
      output: {
        filename: 'flash-sale-product-drop.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 231,
    ratingAvg: 4.7,
  },
  {
    title: 'Founder Story Testimonial',
    description: 'A direct-to-camera customer proof format for founders or creators sharing why the product solved a specific pain point.',
    category: 'testimonials',
    tags: ['free', 'testimonial', 'founder', 'ugc', 'social-proof', 'brand-story'],
    vidscript: `# Founder Story Testimonial
input interview_video = {{video1}}
input music = {{music | "clean-ambient.mp3"}}

[0s - {{duration | 20}}s] = interview_video.Trim({{trim_start | 0}}, {{duration | 20}})
[0s - end] = filter "{{effect | none}}", intensity: {{effect_intensity | 0}}
[0s - end] = audio music, volume: {{music_volume | 0.3}}, fade_out: 2s

[0.5s - 3.5s] = text "{{speaker_name | Maya, Founder}}", style: title, position: top-left
[3.5s - 7.5s] = text "{{pain_point | We were losing hours every week to manual edits}}", style: subtitle, position: center
[7.5s - 14s] = text "{{solution | This workflow cut approvals down to one day}}", style: caption, position: bottom-center
[14s - end] = text "{{cta | Start your first workflow this week}}", style: title, position: bottom-right

output to "founder-story-testimonial.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Interview video',
        required: true,
        group: 'Media',
        helpText: 'Use a direct-to-camera clip with clean audio.',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Soft backing track',
        required: false,
        group: 'Media',
        default: 'clean-ambient.mp3',
      },
      {
        name: 'speaker_name',
        type: 'text',
        label: 'Speaker line',
        required: true,
        group: 'Copy',
        default: 'Maya, Founder',
        maxLength: 32,
      },
      {
        name: 'pain_point',
        type: 'textarea',
        label: 'Pain point',
        required: true,
        group: 'Copy',
        default: 'We were losing hours every week to manual edits',
        maxLength: 88,
      },
      {
        name: 'solution',
        type: 'textarea',
        label: 'Outcome statement',
        required: true,
        group: 'Copy',
        default: 'This workflow cut approvals down to one day',
        maxLength: 88,
      },
      {
        name: 'cta',
        type: 'text',
        label: 'Closing CTA',
        required: true,
        group: 'Copy',
        default: 'Start your first workflow this week',
        maxLength: 48,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Visual treatment',
        required: true,
        group: 'Style',
        default: 'none',
        options: ['none', 'warm', 'contrast'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'trim_start',
        type: 'number',
        label: 'Trim start',
        required: true,
        group: 'Timing',
        default: 0,
        min: 0,
        max: 10,
        step: 1,
        unit: 'seconds',
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Testimonial duration',
        required: true,
        group: 'Timing',
        default: 20,
        min: 10,
        max: 45,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'founder-interview.mp4',
      music: 'clean-ambient.mp3',
      speaker_name: 'Maya, Founder',
      pain_point: 'We were losing hours every week to manual edits',
      solution: 'This workflow cut approvals down to one day',
      cta: 'Start your first workflow this week',
      effect: 'none',
      effect_intensity: 0,
      music_volume: 0.3,
      trim_start: 0,
      duration: 20,
      output: {
        filename: 'founder-story-testimonial.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 163,
    ratingAvg: 4.9,
  },
  {
    title: 'Client Win Case Study',
    description: 'A before-and-after testimonial layout for agencies, SaaS teams, and consultants summarizing measurable client results.',
    category: 'testimonials',
    tags: ['free', 'testimonial', 'case-study', 'results', 'agency', 'saas'],
    vidscript: `# Client Win Case Study
input speaker_video = {{video1}}
input broll_video = {{video2}}
input music = {{music | "steady-confidence.mp3"}}

[0s - {{duration | 18}}s] = speaker_video.Trim(0, {{duration | 18}})
[6s - {{duration | 18}}s] = broll_video.Trim(0, {{broll_trim | 8}})
[0s - end] = filter "{{effect | contrast}}", intensity: {{effect_intensity | 0.2}}
[0s - end] = audio music, volume: {{music_volume | 0.28}}, fade_out: 2s

[0.4s - 3.2s] = text "{{client_name | Harbor Dental}}", style: title, position: top-left
[3.2s - 7.8s] = text "{{challenge | Bookings were flat for three straight months}}", style: subtitle, position: center
[7.8s - 13.4s] = text "{{result | New patient requests increased 42% in six weeks}}", style: caption, position: bottom-center
[13.4s - end] = text "{{cta | See the playbook behind the growth}}", style: title, position: bottom-right

output to "client-win-case-study.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Speaker video',
        required: true,
        group: 'Media',
      },
      {
        name: 'video2',
        type: 'video',
        label: 'Supporting b-roll',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Background music',
        required: false,
        group: 'Media',
        default: 'steady-confidence.mp3',
      },
      {
        name: 'client_name',
        type: 'text',
        label: 'Client name',
        required: true,
        group: 'Copy',
        default: 'Harbor Dental',
        maxLength: 30,
      },
      {
        name: 'challenge',
        type: 'textarea',
        label: 'Challenge summary',
        required: true,
        group: 'Copy',
        default: 'Bookings were flat for three straight months',
        maxLength: 80,
      },
      {
        name: 'result',
        type: 'textarea',
        label: 'Result summary',
        required: true,
        group: 'Copy',
        default: 'New patient requests increased 42% in six weeks',
        maxLength: 88,
      },
      {
        name: 'cta',
        type: 'text',
        label: 'Closing CTA',
        required: true,
        group: 'Copy',
        default: 'See the playbook behind the growth',
        maxLength: 52,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Color treatment',
        required: true,
        group: 'Style',
        default: 'contrast',
        options: ['contrast', 'none', 'warm'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.2,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.28,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Main testimonial duration',
        required: true,
        group: 'Timing',
        default: 18,
        min: 10,
        max: 30,
        step: 1,
        unit: 'seconds',
      },
      {
        name: 'broll_trim',
        type: 'number',
        label: 'B-roll trim',
        required: true,
        group: 'Timing',
        default: 8,
        min: 4,
        max: 12,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'client-interview.mp4',
      video2: 'office-broll.mp4',
      music: 'steady-confidence.mp3',
      client_name: 'Harbor Dental',
      challenge: 'Bookings were flat for three straight months',
      result: 'New patient requests increased 42% in six weeks',
      cta: 'See the playbook behind the growth',
      effect: 'contrast',
      effect_intensity: 0.2,
      music_volume: 0.28,
      duration: 18,
      broll_trim: 8,
      output: {
        filename: 'client-win-case-study.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 142,
    ratingAvg: 4.8,
  },
  {
    title: 'Hot Take Reaction Meme',
    description: 'A social reaction format for quick hot takes, stitched commentary, and lightly chaotic creator posts.',
    category: 'memes',
    tags: ['free', 'meme', 'reaction', 'hot-take', 'creator', 'social'],
    vidscript: `# Hot Take Reaction Meme
input reaction_video = {{video1}}
input music = {{music | "comedic-sting.mp3"}}

[0s - {{duration | 10}}s] = reaction_video.Trim(0, {{duration | 10}})
[0s - end] = filter "{{effect | none}}", intensity: {{effect_intensity | 0}}
[0s - end] = audio music, volume: {{music_volume | 0.4}}, fade_out: 1s

[0.1s - 2.4s] = text "{{setup | When the client says 'just one tiny change'}}", style: title, position: top-left
[2.4s - 6.6s] = text "{{punchline | and sends a 14-point voice note}}", style: subtitle, position: center
[6.6s - end] = text "{{tagline | me opening the project at 11:58 PM}}", style: caption, position: bottom-center

output to "hot-take-reaction-meme.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Reaction clip',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Comedic sting',
        required: false,
        group: 'Media',
        default: 'comedic-sting.mp3',
      },
      {
        name: 'setup',
        type: 'textarea',
        label: 'Setup line',
        required: true,
        group: 'Copy',
        default: "When the client says 'just one tiny change'",
        maxLength: 72,
      },
      {
        name: 'punchline',
        type: 'textarea',
        label: 'Punchline',
        required: true,
        group: 'Copy',
        default: 'and sends a 14-point voice note',
        maxLength: 72,
      },
      {
        name: 'tagline',
        type: 'text',
        label: 'Bottom caption',
        required: true,
        group: 'Copy',
        default: 'me opening the project at 11:58 PM',
        maxLength: 64,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'none',
        options: ['none', 'contrast', 'monochrome'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.4,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Reaction duration',
        required: true,
        group: 'Timing',
        default: 10,
        min: 6,
        max: 15,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'reaction-facecam.mp4',
      music: 'comedic-sting.mp3',
      setup: "When the client says 'just one tiny change'",
      punchline: 'and sends a 14-point voice note',
      tagline: 'me opening the project at 11:58 PM',
      effect: 'none',
      effect_intensity: 0,
      music_volume: 0.4,
      duration: 10,
      output: {
        filename: 'hot-take-reaction-meme.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 318,
    ratingAvg: 4.6,
  },
  {
    title: 'Group Chat Roast Loop',
    description: 'A looping meme template for screenshots, replies, and deadpan commentary when the chat gets out of pocket.',
    category: 'memes',
    tags: ['free', 'meme', 'group-chat', 'loop', 'humor', 'viral-format'],
    vidscript: `# Group Chat Roast Loop
input meme_video = {{video1}}
input music = {{music | "looping-bass.mp3"}}

[0s - {{duration | 9}}s] = meme_video.Trim(0, {{duration | 9}})
[0s - end] = filter "{{effect | contrast}}", intensity: {{effect_intensity | 0.18}}
[0s - end] = audio music, volume: {{music_volume | 0.35}}, fade_out: 0.8s

[0.2s - 2.8s] = text "{{chat_name | team chat at 8:59 AM}}", style: title, position: top-left
[2.8s - 5.8s] = text "{{message | 'quick question' followed by seven paragraphs}}", style: subtitle, position: center
[5.8s - end] = text "{{reaction | everyone pretending they didn't see it}}", style: caption, position: bottom-center

output to "group-chat-roast-loop.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Looping reaction clip',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Looping audio',
        required: false,
        group: 'Media',
        default: 'looping-bass.mp3',
      },
      {
        name: 'chat_name',
        type: 'text',
        label: 'Chat label',
        required: true,
        group: 'Copy',
        default: 'team chat at 8:59 AM',
        maxLength: 40,
      },
      {
        name: 'message',
        type: 'textarea',
        label: 'Message caption',
        required: true,
        group: 'Copy',
        default: "'quick question' followed by seven paragraphs",
        maxLength: 80,
      },
      {
        name: 'reaction',
        type: 'textarea',
        label: 'Reaction caption',
        required: true,
        group: 'Copy',
        default: "everyone pretending they didn't see it",
        maxLength: 80,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'contrast',
        options: ['contrast', 'none', 'monochrome'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.18,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.35,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Loop duration',
        required: true,
        group: 'Timing',
        default: 9,
        min: 6,
        max: 15,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'confused-loop.mp4',
      music: 'looping-bass.mp3',
      chat_name: 'team chat at 8:59 AM',
      message: "'quick question' followed by seven paragraphs",
      reaction: "everyone pretending they didn't see it",
      effect: 'contrast',
      effect_intensity: 0.18,
      music_volume: 0.35,
      duration: 9,
      output: {
        filename: 'group-chat-roast-loop.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 289,
    ratingAvg: 4.5,
  },
  {
    title: 'Dreamscape Quote Montage',
    description: 'A slow, poetic visual treatment for reflective quotes, creator manifestos, and mood-led storytelling.',
    category: 'artistic',
    tags: ['free', 'artistic', 'quote', 'montage', 'poetic', 'mood-video'],
    vidscript: `# Dreamscape Quote Montage
input main_video = {{video1}}
input music = {{music | "ethereal-pad.mp3"}}

[0s - {{duration | 16}}s] = main_video.Trim(0, {{duration | 16}})
[0s - end] = filter "{{effect | vintage}}", intensity: {{effect_intensity | 0.3}}
[0s - end] = audio music, volume: {{music_volume | 0.5}}, fade_out: 2.4s

[0.6s - 5.4s] = text "{{quote_line_one | Make work that feels like a memory}}", style: title, position: center
[5.4s - 10.6s] = text "{{quote_line_two | then give it enough silence to breathe}}", style: subtitle, position: bottom-center
[10.6s - end] = text "{{signature | — Studio Notes}}", style: caption, position: bottom-right

output to "dreamscape-quote-montage.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Atmospheric footage',
        required: true,
        group: 'Media',
        helpText: 'Clouds, light leaks, reflections, or abstract motion work well.',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Ambient track',
        required: false,
        group: 'Media',
        default: 'ethereal-pad.mp3',
      },
      {
        name: 'quote_line_one',
        type: 'textarea',
        label: 'Quote line one',
        required: true,
        group: 'Copy',
        default: 'Make work that feels like a memory',
        maxLength: 72,
      },
      {
        name: 'quote_line_two',
        type: 'textarea',
        label: 'Quote line two',
        required: true,
        group: 'Copy',
        default: 'then give it enough silence to breathe',
        maxLength: 72,
      },
      {
        name: 'signature',
        type: 'text',
        label: 'Signature',
        required: true,
        group: 'Copy',
        default: '— Studio Notes',
        maxLength: 32,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'vintage',
        options: ['vintage', 'warm', 'monochrome', 'none'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Montage duration',
        required: true,
        group: 'Timing',
        default: 16,
        min: 10,
        max: 30,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'misty-window.mp4',
      music: 'ethereal-pad.mp3',
      quote_line_one: 'Make work that feels like a memory',
      quote_line_two: 'then give it enough silence to breathe',
      signature: '— Studio Notes',
      effect: 'vintage',
      effect_intensity: 0.3,
      music_volume: 0.5,
      duration: 16,
      output: {
        filename: 'dreamscape-quote-montage.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 127,
    ratingAvg: 4.9,
  },
  {
    title: 'Neon Moodboard Loop',
    description: 'A stylized artistic loop for fashion drops, music teasers, and editorial moodboards with bold captions.',
    category: 'artistic',
    tags: ['free', 'artistic', 'moodboard', 'fashion', 'music-teaser', 'loop'],
    vidscript: `# Neon Moodboard Loop
input hero_video = {{video1}}
input detail_video = {{video2}}
input music = {{music | "synth-noir.mp3"}}

[0s - {{duration | 14}}s] = hero_video.Trim(0, {{duration | 14}})
[5s - {{duration | 14}}s] = detail_video.Trim(0, {{detail_trim | 8}})
[0s - end] = filter "{{effect | monochrome}}", intensity: {{effect_intensity | 0.4}}
[0s - end] = audio music, volume: {{music_volume | 0.55}}, fade_out: 1.8s

[0.4s - 3.2s] = text "{{title | AFTER HOURS}}", style: title, position: top-left
[3.2s - 8.6s] = text "{{subtitle | city lights / late train / first draft energy}}", style: subtitle, position: center
[8.6s - end] = text "{{cta | drop the full moodboard next}}", style: caption, position: bottom-center

output to "neon-moodboard-loop.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Hero visual',
        required: true,
        group: 'Media',
      },
      {
        name: 'video2',
        type: 'video',
        label: 'Texture visual',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Synth track',
        required: false,
        group: 'Media',
        default: 'synth-noir.mp3',
      },
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        group: 'Copy',
        default: 'AFTER HOURS',
        maxLength: 24,
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Mood line',
        required: true,
        group: 'Copy',
        default: 'city lights / late train / first draft energy',
        maxLength: 72,
      },
      {
        name: 'cta',
        type: 'text',
        label: 'Final caption',
        required: true,
        group: 'Copy',
        default: 'drop the full moodboard next',
        maxLength: 48,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'monochrome',
        options: ['monochrome', 'contrast', 'vintage', 'none'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.4,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.55,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Loop duration',
        required: true,
        group: 'Timing',
        default: 14,
        min: 8,
        max: 24,
        step: 1,
        unit: 'seconds',
      },
      {
        name: 'detail_trim',
        type: 'number',
        label: 'Texture trim',
        required: true,
        group: 'Timing',
        default: 8,
        min: 4,
        max: 12,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'city-hero.mp4',
      video2: 'neon-texture.mp4',
      music: 'synth-noir.mp3',
      title: 'AFTER HOURS',
      subtitle: 'city lights / late train / first draft energy',
      cta: 'drop the full moodboard next',
      effect: 'monochrome',
      effect_intensity: 0.4,
      music_volume: 0.55,
      duration: 14,
      detail_trim: 8,
      output: {
        filename: 'neon-moodboard-loop.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 119,
    ratingAvg: 4.7,
  },
  {
    title: 'Studio Behind-the-Scenes Ad',
    description: 'A creator-first ad template for service businesses sharing process, craft, and a premium booking CTA.',
    category: 'ads',
    tags: ['free', 'ad', 'behind-the-scenes', 'service-business', 'creator', 'process'],
    vidscript: `# Studio Behind-the-Scenes Ad
input process_video = {{video1}}
input detail_video = {{video2}}
input music = {{music | "confident-beat.mp3"}}

[0s - {{duration | 18}}s] = process_video.Trim(0, {{duration | 18}})
[6s - {{duration | 18}}s] = detail_video.Trim(0, {{detail_trim | 9}})
[0s - end] = filter "{{effect | warm}}", intensity: {{effect_intensity | 0.22}}
[0s - end] = audio music, volume: {{music_volume | 0.58}}, fade_out: 1.6s

[0.5s - 3.2s] = text "{{brand_name | Meridian Studio}}", style: title, position: top-left
[3.2s - 7.5s] = text "{{headline | Campaigns built from strategy, not guesswork}}", style: subtitle, position: center
[7.5s - 12.5s] = text "{{proof | Shoot day to final cut in five business days}}", style: caption, position: bottom-center
[12.5s - end] = text "{{cta | Book your launch sprint}}", style: title, position: bottom-right

output to "studio-behind-the-scenes-ad.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Process footage',
        required: true,
        group: 'Media',
      },
      {
        name: 'video2',
        type: 'video',
        label: 'Detail footage',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Background track',
        required: false,
        group: 'Media',
        default: 'confident-beat.mp3',
      },
      {
        name: 'brand_name',
        type: 'text',
        label: 'Brand name',
        required: true,
        group: 'Copy',
        default: 'Meridian Studio',
        maxLength: 28,
      },
      {
        name: 'headline',
        type: 'textarea',
        label: 'Headline',
        required: true,
        group: 'Copy',
        default: 'Campaigns built from strategy, not guesswork',
        maxLength: 72,
      },
      {
        name: 'proof',
        type: 'text',
        label: 'Proof point',
        required: true,
        group: 'Copy',
        default: 'Shoot day to final cut in five business days',
        maxLength: 64,
      },
      {
        name: 'cta',
        type: 'text',
        label: 'CTA',
        required: true,
        group: 'Copy',
        default: 'Book your launch sprint',
        maxLength: 32,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'warm',
        options: ['warm', 'contrast', 'none'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.22,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.58,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Ad duration',
        required: true,
        group: 'Timing',
        default: 18,
        min: 10,
        max: 30,
        step: 1,
        unit: 'seconds',
      },
      {
        name: 'detail_trim',
        type: 'number',
        label: 'Detail trim',
        required: true,
        group: 'Timing',
        default: 9,
        min: 4,
        max: 12,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'studio-process.mp4',
      video2: 'studio-detail.mp4',
      music: 'confident-beat.mp3',
      brand_name: 'Meridian Studio',
      headline: 'Campaigns built from strategy, not guesswork',
      proof: 'Shoot day to final cut in five business days',
      cta: 'Book your launch sprint',
      effect: 'warm',
      effect_intensity: 0.22,
      music_volume: 0.58,
      duration: 18,
      detail_trim: 9,
      output: {
        filename: 'studio-behind-the-scenes-ad.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 157,
    ratingAvg: 4.8,
  },
  {
    title: 'Creator POV Testimonial',
    description: 'A casual, first-person testimonial for product creators or coaches who want a relatable talking-head format.',
    category: 'testimonials',
    tags: ['free', 'testimonial', 'creator', 'pov', 'ugc-style', 'social-proof'],
    vidscript: `# Creator POV Testimonial
input facecam_video = {{video1}}
input music = {{music | "light-pulse.mp3"}}

[0s - {{duration | 16}}s] = facecam_video.Trim(0, {{duration | 16}})
[0s - end] = filter "{{effect | warm}}", intensity: {{effect_intensity | 0.14}}
[0s - end] = audio music, volume: {{music_volume | 0.25}}, fade_out: 1.8s

[0.5s - 3.5s] = text "{{speaker_name | Jess, creator}}", style: title, position: top-left
[3.5s - 7.8s] = text "{{hook | I didn't expect this workflow to save my launch week}}", style: subtitle, position: center
[7.8s - 12.6s] = text "{{outcome | But I shipped five deliverables without another all-nighter}}", style: caption, position: bottom-center
[12.6s - end] = text "{{cta | Try the setup that made it click}}", style: title, position: bottom-right

output to "creator-pov-testimonial.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Facecam clip',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Background music',
        required: false,
        group: 'Media',
        default: 'light-pulse.mp3',
      },
      {
        name: 'speaker_name',
        type: 'text',
        label: 'Speaker line',
        required: true,
        group: 'Copy',
        default: 'Jess, creator',
        maxLength: 28,
      },
      {
        name: 'hook',
        type: 'textarea',
        label: 'Hook',
        required: true,
        group: 'Copy',
        default: "I didn't expect this workflow to save my launch week",
        maxLength: 80,
      },
      {
        name: 'outcome',
        type: 'textarea',
        label: 'Outcome',
        required: true,
        group: 'Copy',
        default: "But I shipped five deliverables without another all-nighter",
        maxLength: 88,
      },
      {
        name: 'cta',
        type: 'text',
        label: 'CTA',
        required: true,
        group: 'Copy',
        default: 'Try the setup that made it click',
        maxLength: 40,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'warm',
        options: ['warm', 'none', 'contrast'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.14,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.25,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Clip duration',
        required: true,
        group: 'Timing',
        default: 16,
        min: 10,
        max: 30,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'creator-pov.mp4',
      music: 'light-pulse.mp3',
      speaker_name: 'Jess, creator',
      hook: "I didn't expect this workflow to save my launch week",
      outcome: "But I shipped five deliverables without another all-nighter",
      cta: 'Try the setup that made it click',
      effect: 'warm',
      effect_intensity: 0.14,
      music_volume: 0.25,
      duration: 16,
      output: {
        filename: 'creator-pov-testimonial.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 176,
    ratingAvg: 4.8,
  },
  {
    title: 'Deadpan Zoom Meme',
    description: 'A fast meme template for slow zoom reactions, passive-aggressive office humor, and chronically online commentary.',
    category: 'memes',
    tags: ['free', 'meme', 'deadpan', 'office-humor', 'reaction', 'loopable'],
    vidscript: `# Deadpan Zoom Meme
input reaction_video = {{video1}}
input music = {{music | "awkward-pluck.mp3"}}

[0s - {{duration | 8}}s] = reaction_video.Trim(0, {{duration | 8}})
[0s - end] = filter "{{effect | none}}", intensity: {{effect_intensity | 0}}
[0s - end] = audio music, volume: {{music_volume | 0.32}}, fade_out: 0.8s

[0.2s - 2.8s] = text "{{setup | manager: can we make it pop more?}}", style: title, position: top-left
[2.8s - 5.4s] = text "{{pause_line | me opening the seventh revision}}", style: subtitle, position: center
[5.4s - end] = text "{{tagline | absolutely no thoughts, just keyframes}}", style: caption, position: bottom-center

output to "deadpan-zoom-meme.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Reaction clip',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Background sting',
        required: false,
        group: 'Media',
        default: 'awkward-pluck.mp3',
      },
      {
        name: 'setup',
        type: 'textarea',
        label: 'Setup',
        required: true,
        group: 'Copy',
        default: 'manager: can we make it pop more?',
        maxLength: 64,
      },
      {
        name: 'pause_line',
        type: 'text',
        label: 'Middle caption',
        required: true,
        group: 'Copy',
        default: 'me opening the seventh revision',
        maxLength: 56,
      },
      {
        name: 'tagline',
        type: 'textarea',
        label: 'Bottom caption',
        required: true,
        group: 'Copy',
        default: 'absolutely no thoughts, just keyframes',
        maxLength: 72,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'none',
        options: ['none', 'contrast', 'monochrome'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.32,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Zoom duration',
        required: true,
        group: 'Timing',
        default: 8,
        min: 5,
        max: 12,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'deadpan-reaction.mp4',
      music: 'awkward-pluck.mp3',
      setup: 'manager: can we make it pop more?',
      pause_line: 'me opening the seventh revision',
      tagline: 'absolutely no thoughts, just keyframes',
      effect: 'none',
      effect_intensity: 0,
      music_volume: 0.32,
      duration: 8,
      output: {
        filename: 'deadpan-zoom-meme.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 267,
    ratingAvg: 4.6,
  },
  {
    title: 'Painterly Product Poem',
    description: 'An art-forward template for handmade goods, ceramics, fragrance, or slow luxury launches with lyrical copy.',
    category: 'artistic',
    tags: ['free', 'artistic', 'product-film', 'luxury', 'handmade', 'poetic'],
    vidscript: `# Painterly Product Poem
input hero_video = {{video1}}
input music = {{music | "soft-piano.mp3"}}

[0s - {{duration | 18}}s] = hero_video.Trim(0, {{duration | 18}})
[0s - end] = filter "{{effect | warm}}", intensity: {{effect_intensity | 0.26}}
[0s - end] = audio music, volume: {{music_volume | 0.42}}, fade_out: 2s

[0.8s - 5.6s] = text "{{line_one | Handmade objects deserve a slower frame}}", style: title, position: center
[5.6s - 11.4s] = text "{{line_two | light on glaze / shadow on linen / a breath before the sale}}", style: subtitle, position: bottom-center
[11.4s - end] = text "{{signature | collection arrives friday}}", style: caption, position: bottom-right

output to "painterly-product-poem.mp4", resolution: 1080x1920`,
    placeholders: [
      {
        name: 'video1',
        type: 'video',
        label: 'Hero footage',
        required: true,
        group: 'Media',
      },
      {
        name: 'music',
        type: 'audio',
        label: 'Music bed',
        required: false,
        group: 'Media',
        default: 'soft-piano.mp3',
      },
      {
        name: 'line_one',
        type: 'textarea',
        label: 'Opening line',
        required: true,
        group: 'Copy',
        default: 'Handmade objects deserve a slower frame',
        maxLength: 72,
      },
      {
        name: 'line_two',
        type: 'textarea',
        label: 'Poetic line',
        required: true,
        group: 'Copy',
        default: 'light on glaze / shadow on linen / a breath before the sale',
        maxLength: 88,
      },
      {
        name: 'signature',
        type: 'text',
        label: 'Closing caption',
        required: true,
        group: 'Copy',
        default: 'collection arrives friday',
        maxLength: 36,
      },
      {
        name: 'effect',
        type: 'select',
        label: 'Effect',
        required: true,
        group: 'Style',
        default: 'warm',
        options: ['warm', 'vintage', 'none'],
      },
      {
        name: 'effect_intensity',
        type: 'number',
        label: 'Effect intensity',
        required: true,
        group: 'Style',
        default: 0.26,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'music_volume',
        type: 'number',
        label: 'Music volume',
        required: true,
        group: 'Style',
        default: 0.42,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Film duration',
        required: true,
        group: 'Timing',
        default: 18,
        min: 10,
        max: 30,
        step: 1,
        unit: 'seconds',
      },
    ],
    defaultValues: {
      video1: 'ceramic-detail.mp4',
      music: 'soft-piano.mp3',
      line_one: 'Handmade objects deserve a slower frame',
      line_two: 'light on glaze / shadow on linen / a breath before the sale',
      signature: 'collection arrives friday',
      effect: 'warm',
      effect_intensity: 0.26,
      music_volume: 0.42,
      duration: 18,
      output: {
        filename: 'painterly-product-poem.mp4',
        resolution: '1080x1920',
      },
    },
    downloads: 134,
    ratingAvg: 4.9,
  },
];

async function ensureUsers() {
  const usersByEmail = new Map<string, Awaited<ReturnType<typeof prisma.user.findUnique>>>();

  for (const userData of seedUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const createdUser = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          credits: userData.credits,
          isCreator: userData.isCreator ?? false,
        },
      });

      usersByEmail.set(userData.email, createdUser);
      console.log(`Created user: ${userData.email}`);
      continue;
    }

    const shouldUpdateName = existingUser.name !== userData.name;
    const shouldUpdateCreatorFlag = Boolean(userData.isCreator) && !existingUser.isCreator;

    if (shouldUpdateName || shouldUpdateCreatorFlag) {
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: userData.name,
          isCreator: userData.isCreator ?? existingUser.isCreator,
        },
      });

      usersByEmail.set(userData.email, updatedUser);
      console.log(`Updated user seed data: ${userData.email}`);
      continue;
    }

    usersByEmail.set(userData.email, existingUser);
    console.log(`User already exists: ${userData.email}`);
  }

  const creator = usersByEmail.get('admin@example.com');

  if (!creator) {
    throw new Error('Seed creator user was not found.');
  }

  return creator;
}

async function upsertTemplateByCreatorAndTitle(creatorId: number, template: SeedTemplate) {
  const existingTemplate = await prisma.template.findFirst({
    where: {
      creatorId,
      title: template.title,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const data = {
    creatorId,
    title: template.title,
    description: template.description,
    thumbnailUrl: template.thumbnailUrl ?? null,
    vidscript: template.vidscript,
    placeholders: template.placeholders,
    defaultValues: template.defaultValues,
    priceCents: 0,
    category: template.category,
    tags: template.tags,
    downloads: template.downloads,
    ratingAvg: template.ratingAvg,
    status: 'public' as const,
    publishedAt: publicTemplatePublishedAt,
  };

  if (existingTemplate) {
    await prisma.template.update({
      where: { id: existingTemplate.id },
      data,
    });

    console.log(`Updated template: ${template.title}`);
    return;
  }

  await prisma.template.create({
    data,
  });

  console.log(`Created template: ${template.title}`);
}

async function seedStarterTemplates(creatorId: number) {
  for (const template of starterTemplates) {
    await upsertTemplateByCreatorAndTitle(creatorId, template);
  }
}

async function main() {
  const creator = await ensureUsers();
  await seedStarterTemplates(creator.id);

  console.log(`Seeded ${starterTemplates.length} public starter templates successfully.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
