class Condition {
  constructor(childs) {
    this.childs = childs;
  }
  check(rotation) {
    return false;
  }
  repr(rotation) {
    return "empty";
  }
  get title() {
    return null
  }
}

class TitleProperties {
  constructor(color, skill_bonus, stat_bonus) {
    this.color = color;
    this.skill_bonus = skill_bonus;
    this.stat_bonus = stat_bonus;
  }
  title_repr(name, progress_repr, show_stat=false) {
    var repr = name + " (" + progress_repr + ")";
    if (show_stat) {
      if (this.skill_bonus.length > 0) {
        repr += " - " + this.skill_bonus;
      }
      if (this.stat_bonus > 0) {
        repr += " - 스탯 " + this.stat_bonus;
      }
    }
    return repr;
  }
}

class CountCondition extends Condition {
  constructor(childs, threshold) {
    super(childs);
    this.threshold = threshold;
  }
  get_count(rotation) {
    return -1;
  }
  check(rotation) {
    return this.get_count(rotation) >= this.threshold;
  }
  prog(rotation) {
    return this.get_count(rotation) + "/" + this.threshold;
  }
}

class TrackDistanceTypeCondition extends CountCondition {
  constructor(track, dist_type, threshold) {
    super([], threshold);
    this.track = track;
    this.dist_type = dist_type;
  }
  get_count(rotation) {
    return rotation.count_track_dist_type(this.track, this.dist_type);
  }
  repr(rotation) {
    return this.track + " / " + this.dist_type + " (" + this.prog(rotation) + ")";
  }
}

class RaceCondition extends Condition {
  constructor(race_name) {
    super([]);
    this.race_name = race_name;
  }
  check(rotation) {
    return rotation.get_race_names().includes(this.race_name);
  }
  repr(rotation) {
    return this.race_name;
  }
  get title() {
    if (!(this.race_name in window.race_manager.race_name_to_date_ids)) return null;
    return window.race_manager.race_name_to_date_ids[this.race_name].map(
      (date_id) => date_id_to_text(date_id)
    ).join(' / ');
  }
}

class ClassicRaceCondition extends RaceCondition {
  check(rotation) {
    return rotation.get_classic_race_names().includes(this.race_name);
  }
  repr(rotation) {
    return this.race_name + " (클래식)";
  }
  get title() {
    if (!(this.race_name in window.race_manager.race_name_to_date_ids)) return null;
    return window.race_manager.race_name_to_date_ids[this.race_name].filter(
      (date_id) => (date_id[0] == 'C')
    ).map(
      (date_id) => date_id_to_text(date_id)
    ).join(' / ');
  }
}

class SeniorRaceCondition extends RaceCondition {
  check(rotation) {
    return rotation.get_senior_race_names().includes(this.race_name);
  }
  repr(rotation) {
    return this.race_name + " (시니어)";
  }
  get title() {
    if (!(this.race_name in window.race_manager.race_name_to_date_ids)) return null;
    return window.race_manager.race_name_to_date_ids[this.race_name].filter(
      (date_id) => (date_id[0] == 'S')
    ).map(
      (date_id) => date_id_to_text(date_id)
    ).join(' / ');
  }
}

class ListCondition extends CountCondition {
  constructor(race_conditions, threshold, prefix) {
    super(race_conditions, threshold);
    this.prefix = prefix
  }
  get_count(rotation) {
    var progress = 0;
    for(const child of this.childs) {
      progress += child.check(rotation);
    }
    return progress;
  }
  repr(rotation) {
    return this.prefix + " (" + this.prog(rotation) + ")";
  }
}

class RaceListCondition extends ListCondition {
  constructor(race_names, threshold, prefix) {
    super(race_names.map(race_name => new RaceCondition(race_name)), threshold, prefix);
  }
}

class RaceListTitle extends RaceListCondition {
  constructor(name, race_names, threshold, color, skill_bonus, stat_bonus) {
    super(race_names, threshold);
    this.name = name;
    this.title_property = new TitleProperties(color, skill_bonus, stat_bonus);
  }
  repr(rotation, show_stat=false) {
    return this.title_property.title_repr(this.name, this.prog(rotation), show_stat);
  }
}

class CharUma extends RaceListTitle {
  constructor() {
    super("카리스마 우마우스메", ["사츠키상", "일본 더비 (도쿄 우준)", "국화상"], 3, "silver", "", 20);
  }
}

class HeroineUma extends RaceListTitle {
  constructor() {
    super("히로인 우마우스메", ["벚꽃상", "오크스", "추화상"], 3, "silver", "", 20);
  }
}

class ListUma extends ListCondition {
  constructor(name, conditions, threshold, color, skill_bonus, stat_bonus) {
    super(conditions, threshold, "");
    this.name = name;
    this.title_property = new TitleProperties(color, skill_bonus, stat_bonus);
  }
  repr(rotation, show_stat=false) {
    return this.title_property.title_repr(this.name, this.prog(rotation), show_stat);
  }
}


class SpringUma extends RaceListTitle {
  constructor() {
    super("봄의 패자", ["오사카배", "텐노상 (봄)", "타카라즈카 기념"], 3, "silver", "", 20);
  }
}


class FallUma extends ListUma {
  constructor() {
    super("가을의 패자", [
      new ListCondition([new ClassicRaceCondition("텐노상 (가을)"), new ClassicRaceCondition("재팬컵"), new ClassicRaceCondition("아리마 기념")], 3, "클래식 가을 패자"),
      new ListCondition([new SeniorRaceCondition("텐노상 (가을)"), new SeniorRaceCondition("재팬컵"), new SeniorRaceCondition("아리마 기념")], 3, "시니어 가을 패자")
    ], 1, "silver", "", 20);
  }
}


class CountTitle extends CountCondition {
  constructor(name, threshold, color, skill_bonus, stat_bonus) {
    super([], threshold);
    this.name = name;
    this.title_property = new TitleProperties(color, skill_bonus, stat_bonus);
  }
  repr(rotation, show_stat=false) {
    return this.title_property.title_repr(this.name, this.prog(rotation), show_stat);
  }
}

class DirtTitle extends CountTitle {
  get_count(rotation) {
    return rotation.count_dirt();
  }
}

class G1DirtTitle extends CountTitle {
  get_count(rotation) {
    return rotation.count_dirt_g1();
  }
}

class BasisDistTitle extends CountTitle {
  get_count(rotation) {
    return rotation.count_basis_dist();
  }
}

class NonBasisDistTitle extends CountTitle {
  get_count(rotation) {
    return rotation.count_non_basis_dist();
  }
}

class NameFilterTitle extends CountTitle {
  constructor(name, threshold, color, skill_bonus, stat_bonus, race_name_filter) {
    super(name, threshold, color, skill_bonus, stat_bonus);
    this.race_name_filter = race_name_filter;
  }
  get_count(rotation) {
    return rotation.count_race_unique_name_filter(this.race_name_filter);
  }
}

class FilterTitle extends CountTitle {
  constructor(name, threshold, color, skill_bonus, stat_bonus, race_filter, title) {
    super(name, threshold, color, skill_bonus, stat_bonus);
    this.race_filter = race_filter;
    this._title = title;
  }

  get_count(rotation) {
    return rotation.count_race_filter(this.race_filter);
  }

  get title() {
    return this._title;
  }
}

class G123LocationFilterTitle extends FilterTitle {
  constructor(name, threshold, color, skill_bonus, stat_bonus, locations) {
    super(name, threshold, color, skill_bonus, stat_bonus, location_filter_gen_g123(locations), locations.join(", ") + " 중상 레이스")
  }
}

function op_filter(race) {
  return ["G I", "G II", "G III", "OP"].includes(race.grade);
}

function location_filter_gen_g123(locations) {
  function internal(race) {
    return ["G I", "G II", "G III"].includes(race.grade) && locations.includes(race.location);
  }
  return internal;
}

function get_title_rewards(rotation) {
  stat_bonus = 0;
  skill_bonuses = [];
  for(const title of window.Titles) {
    if (title.check(rotation)) {
      stat_bonus += title.title_property.stat_bonus
      var skill_bonus = title.title_property.skill_bonus
      if(skill_bonus.length > 0) {
        skill_bonuses.push(skill_bonus);
      }
    }
  }
  return [stat_bonus, skill_bonuses]
}

function stat_bonus_when_change(date_id, race_id) {
  new_rotation = new Rotation();
  new_rotation.set_date_id_to_race_id(window.rotation.date_id_to_race_id)

  new_rotation.select(date_id, race_id);

  return get_title_rewards(new_rotation)[0];
}

function stat_bonus_when_remove(date_id) {
  return stat_bonus_when_change(date_id, -1);
}

window.Titles = [
  new CharUma(),
  new ListUma("원더풀 우마무스메", [
      new CharUma(),
      new ListCondition([new ClassicRaceCondition("재팬컵"), new ClassicRaceCondition("아리마 기념")], 1, "G I 원더풀 클래식 레이스")
    ], 2, "gold", "", 30),
  new ListUma("베스트 우마무스메", [
      new CharUma(),
      new RaceListCondition(["텐노상 (봄)", "타카라즈카 기념", "재팬컵", "텐노상 (가을)", "오사카배", "아리마 기념"], 2, "G I 베스트 레이스")
    ], 2, "gold", "", 30),
  new ListUma("레전드 우마무스메", [
      new ListCondition([new CharUma(), new HeroineUma()], 1, "칭호"),
      new SpringUma(),
      new FallUma(),
    ], 3, "gold", "뒷심 Lv+1", 0),
  new HeroineUma(),
  new ListUma("프린세스 우마무스메", [
      new HeroineUma(),
      new ClassicRaceCondition("엘리자베스 여왕배"),
    ], 2, "gold", "", 20),
  new ListUma("퀸 우마무스메", [
      new HeroineUma(),
      new RaceListCondition(["빅토리아 마일", "한신 쥬버나일 필리스"], 2, "G I 퀸 마일 레이스"),
      new ListCondition([new ClassicRaceCondition("엘리자베스 여왕배"), new SeniorRaceCondition("엘리자베스 여왕배")], 2, "여왕배 2연패")
    ], 3, "gold", "", 30),
  new RaceListTitle("고속 마일러", ["NHK 마일컵", "야스다 기념", "마일 챔피언십"], 3, "gold", "", 30),
  new RaceListTitle("신속 마일러", ["NHK 마일컵", "벚꽃상", "야스다 기념", "빅토리아 마일", "마일 챔피언십", "한신 쥬버나일 필리스", "아사히배 퓨처러티 스테이크스"], 6, "gold", "마일 직선 Lv+1", 0),
  new RaceListTitle("광속 스프린터", ["타카마츠노미야 기념", "스프린터즈 스테이크스", "야스다 기념", "마일 챔피언십"], 4, "silver", "", 30),
  new RaceListTitle("수완 스프린터", ["타카마츠노미야 기념", "스프린터즈 스테이크스"], 2, "silver", "", 20),
  new RaceListTitle("표창패의 패자", ["텐노상 (봄)", "텐노상 (가을)"], 2, "silver", "", 20),
  new SpringUma(),
  new FallUma(),
  new ListUma("명인 우마무스메", [
      new TrackDistanceTypeCondition("잔디", "단거리", 1),
      new TrackDistanceTypeCondition("잔디", "마일", 1),
      new TrackDistanceTypeCondition("잔디", "중거리", 1),
      new TrackDistanceTypeCondition("잔디", "장거리", 1),
    ], 4, "silver", "", 10),
  new BasisDistTitle("근간거리의 패자", 10, "silver", "", 20),
  new NonBasisDistTitle("비근간거리의 패자", 10, "silver", "", 20),
  new ListUma("달인 우마무스메", [
      new TrackDistanceTypeCondition("더트", "단거리", 1),
      new TrackDistanceTypeCondition("더트", "마일", 1),
      new TrackDistanceTypeCondition("더트", "중거리", 1),
    ], 3, "silver", "", 10),
  new ListUma("더트 스프린터", [
      new ClassicRaceCondition("JBC 스프린트"),
      new SeniorRaceCondition("JBC 스프린트"),
    ], 2, "silver", "", 20),
  new RaceListTitle("더트의 신성", ["유니콘 스테이크스", "레오파드 스테이크스", "재팬 더트 더비"], 3, "silver", "", 10),

  new G1DirtTitle("더트 G1 강자", 3, "silver", "", 20),
  new G1DirtTitle("더트 G1 괴물", 4, "silver", "", 20),
  new G1DirtTitle("더트 G1 제왕", 5, "silver", "", 30),
  new G1DirtTitle("더트 G1 패자", 9, "gold", "레커맨드 Lv+1", 0),

  new DirtTitle("더트 고수", 5, "silver", "", 10),
  new DirtTitle("더트 전문가", 10, "silver", "", 20),
  new DirtTitle("더트 달인", 15, "gold", "", 20),

  new RaceListTitle("가련한 우마무스메", ["후츄 우마무스메 스테이크스", "한신 우마무스메 스테이크스", "교토 우마무스메 스테이크스", "나카야마 우마무스메 스테이크스", "후쿠시마 우마무스메 스테이크스"], 3, "silver", "", 10),
  new RaceListTitle("월드 우마무스메", ["재팬컵", "재팬 더트 더비", "아르헨티나 공화국배", "뉴질랜드 트로피", "아메리카 JCC", "사우디아라비아 로얄컵"], 3, "silver", "", 10),
  new RaceListTitle("주니어 우마무스메", ["케이오배 주니어 스테이크스", "데일리배 주니어 스테이크스", "하코다테 주니어 스테이크스", "니이가타 주니어 스테이크스", "삿포로 주니어 스테이크스", "코쿠라 주니어 스테이크스", "도쿄 스포츠배 주니어 스테이크스", "교토 주니어 스테이크스", "츄쿄 주니어 스테이크스", "후쿠시마 주니어 스테이크스"], 3, "silver", "", 10),

  new FilterTitle("베테랑 우마무스메", 10, "bronze", "", 10, op_filter, "OP 이상의 레이스"),

  new G123LocationFilterTitle("홋카이도 마스터", 3, "bronze", "", 10, ["삿포로", "하코다테"]),
  new G123LocationFilterTitle("토호쿠 마스터", 3, "bronze", "", 10, ["후쿠시마", "니이가타", "모리오카"]),
  new G123LocationFilterTitle("칸토 마스터", 3, "bronze", "", 10, ["도쿄", "나카야마", "오이", "카와사키", "후나바시"]),
  new G123LocationFilterTitle("서일본 마스터", 3, "bronze", "", 10, ["츄쿄", "한신", "교토"]),
  new G123LocationFilterTitle("코쿠라 마스터", 2, "bronze", "", 10, ["코쿠라"]),
];