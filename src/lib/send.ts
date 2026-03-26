export interface SendTarget {
  platform: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
}

export interface SendOption {
  label: string;
  url: string;
}

export function getSendOptions(target: SendTarget, messageBody: string): SendOption[] {
  const options: SendOption[] = [];
  const encoded = encodeURIComponent(messageBody);

  if (target.email) {
    options.push({
      label: 'Email',
      url: `mailto:${encodeURIComponent(target.email)}?body=${encoded}`,
    });
  }

  if (target.phone) {
    const cleanPhone = target.phone.replace(/[^+\d]/g, '');
    options.push({
      label: 'iMessage',
      url: `imessage://${cleanPhone}`,
    });
    options.push({
      label: 'WhatsApp',
      url: `https://wa.me/${cleanPhone.replace(/^\+/, '')}?text=${encoded}`,
    });
  }

  if (target.linkedinUrl) {
    const url = target.linkedinUrl.replace(/\/$/, '');
    options.push({
      label: 'LinkedIn',
      url: `${url}/overlay/create-message/`,
    });
  }

  if (target.platform === 'wechat') {
    options.push({
      label: 'Copy for WeChat',
      url: '__copy__',
    });
  }

  return options;
}
