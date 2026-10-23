import { formatNumber, formatPercent, formatTime } from '../../utils/format.js';
import { el } from '../dom.js';

export class StatsView {
  constructor(ctx) {
    this.ctx = ctx;
    this.element = el('section', { class: 'view stats' });
    this.timer = null;
  }

  onShow() {
    this.render();
    this.timer = setInterval(() => this.render(), 1000);
  }

  onHide() {
    clearInterval(this.timer);
  }

  render() {
    const { state, upgrades } = this.ctx;
    const s = upgrades.stats;
    const groups = [
      {
        title: 'Savaş',
        rows: [
          ['Hasar', formatNumber(s.damage)],
          ['Saldırı hızı', `${s.attackSpeed.toFixed(1)}/sn`],
          ['Ortalama DPS', formatNumber(upgrades.dps)],
          ['Kritik şans', formatPercent(s.critChance)],
          ['Kritik hasar', `x${s.critDamage.toFixed(2)}`],
          ['Dokunma hasarı', formatNumber(s.damage * s.tapMultiplier)],
          ['Maks. can', formatNumber(s.maxHp)],
          ['Can yenileme', `${formatNumber(s.hpRegen)}/sn`],
          ['Altın çarpanı', `x${s.goldMultiplier.toFixed(2)}`],
        ],
      },
      {
        title: 'İlerleme',
        rows: [
          ['Karakter seviyesi', this.ctx.level.level],
          ['Tecrübe', `${formatNumber(this.ctx.level.xp)} / ${formatNumber(this.ctx.level.xpToNext())}`],
          ['Seviye bonusu', `+%${Math.round((this.ctx.level.multiplier - 1) * 100)} hasar ve can`],
          ['Şu anki aşama', state.stage],
          ['Bu koşuda en yüksek', state.highestStage],
          ['Tüm zamanların en iyisi', state.bestStage],
          ['Rebirth', formatNumber(state.prestige.rebirths)],
          ['Toplam Ruh Taşı', formatNumber(state.prestige.totalSouls)],
          ['Toplam öldürme', formatNumber(state.stats.totalKills)],
          ['Boss öldürme', formatNumber(state.stats.bossKills)],
          ['Yenilgi', formatNumber(state.stats.deaths)],
          ['Toplam altın', formatNumber(state.stats.totalGold)],
          ['Altın / sn', formatNumber(state.goldPerSecond)],
          ['Dokunma', formatNumber(state.stats.taps)],
          ['Yetenek kullanımı', formatNumber(state.stats.skillCasts)],
          ['Geçilen aşama', formatNumber(state.stats.stagesCleared)],
          ['Tamamlanan görev', formatNumber(state.stats.dailyCompleted)],
          ['Bulunan eşya', formatNumber(state.stats.itemsFound)],
          ['Efsanevi eşya', formatNumber(state.stats.legendaryFound)],
          ['Parçalanan eşya', formatNumber(state.stats.itemsSalvaged)],
          ['Oyun süresi', formatTime(state.stats.playTime)],
        ],
      },
    ];

    this.element.replaceChildren(
      ...groups.map((group) =>
        el('div', { class: 'stat-group' }, [
          el('h3', { text: group.title }),
          el(
            'dl',
            { class: 'stat-list' },
            group.rows.flatMap(([label, value]) => [el('dt', { text: label }), el('dd', { text: String(value) })]),
          ),
        ]),
      ),
    );
  }
}
