import {
  formatRedemptionRate,
  type RewardsPublicSettings,
} from '@/lib/rewards/calculator';
import Accordion, { type AccordionItem } from '@/components/uielements/Accordion';

type Props = { settings: RewardsPublicSettings };

const fmt = (n: number) => n.toLocaleString('en-US');

function buildFaqs(settings: RewardsPublicSettings): AccordionItem[] {
  const ppd = settings.pointsPerDollar === 1 ? '1 point' : `${settings.pointsPerDollar} points`;
  const minRedeemCopy =
    settings.minToRedeem > 0
      ? `Minimum redemption is ${fmt(settings.minToRedeem)} points.`
      : "There's no minimum redemption, so even a small balance is useful.";
  const expiryCopy =
    settings.pointsExpiryMonths === 0
      ? 'Your points never expire — once you earn them, they stick around.'
      : `Points stay valid for ${settings.pointsExpiryMonths} months from when they were earned. As long as you're shopping with us roughly once a year, your balance carries forward.`;
  const weekendCopy =
    settings.weekendMultiplier > 1
      ? ` Weekend orders earn ${settings.weekendMultiplier}× points.`
      : '';

  return [
    {
      q: 'How do I earn points?',
      a: `You earn ${ppd} for every dollar spent in the shop, online or in person.${weekendCopy} Points are added to your account automatically once your order is fulfilled.`,
    },
    {
      q: 'Do my points expire?',
      a: expiryCopy,
    },
    {
      q: 'How do I move up tiers?',
      a:
        settings.tierWindowMonths > 0
          ? `Tiers are based on points you earn in a rolling ${settings.tierWindowMonths}-month qualifying period. Once you hit ${fmt(settings.connoisseurThreshold)} points in your period you're a Connoisseur, and at ${fmt(settings.masterCutThreshold)} you're Master Cut — bumped up immediately. At the end of your period we check what you earned and lock in your tier for the next ${settings.tierWindowMonths} months. Redeeming points never costs you tier status; only earning matters.`
          : `Tiers are based on your lifetime point total — not annual spend. Once you hit ${fmt(settings.connoisseurThreshold)} points you're a Connoisseur, and once you hit ${fmt(settings.masterCutThreshold)} you're at Master Cut. There's no rolling reset, no requalification: once you're up, you stay up.`,
    },
    {
      q: 'Can I redeem points for cash?',
      a: `Not for cash, but you can apply points as a discount at checkout. ${formatRedemptionRate(settings)}. ${minRedeemCopy}`,
    },
    {
      q: 'What about returns or refunds?',
      a: 'If you return an order, the points earned on that order are reversed. If you redeemed points at checkout, those points come back to your balance. Simple.',
    },
    {
      q: 'Is there a fee or subscription?',
      a: "No. Rewards is free for any registered customer. We don't sell premium tiers, paid memberships, or anything like that. Make an account, start earning.",
    },
  ];
}

export default function RewardsFaq({ settings }: Props) {
  return <Accordion items={buildFaqs(settings)} />;
}
