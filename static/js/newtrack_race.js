function dist_to_text(distance) {
  if (distance <= 1400) return "단거리";
  if (distance <= 1800) return "마일";
  if (distance <= 2400) return "중거리";
  if (distance <= 3200) return "장거리";
  return "?거리";
}

function getJCS(text) {
  if (text.indexOf("주니어급") != -1) return "J";
  if (text.indexOf("클래식급") != -1) return "C";
  if (text.indexOf("시니어급") != -1) return "S";
  return "X";
}

function getAB(text) {
  if (text.indexOf("전반") != -1) return "A";
  if (text.indexOf("후반") != -1) return "B";
  return "X";
}

function getMonth(text) {
  for(var m = 12; m >= 1; m --) {
    if (text.indexOf(m + "월") != -1) return m;
  }
  return 0;
}

function create_date_id(jcs, month, ab) {
  return jcs + "_" + month + "_" + ab;
}

function date_text_to_id(text) {
  var jcs = getJCS(text);
  var month = getMonth(text);
  var ab = getAB(text);
  return create_date_id(jcs, month, ab);
}

class Race {
  constructor(id, race_json) {
    this.id = id;
    this.grade = race_json["grade"];
    this.name = race_json["name"];
    this.date = race_json["date"];
    this.location = race_json["location"];
    this.track = race_json["track"];
    this.distance = race_json["distance"];
    this.direction = race_json["direction"];
    this.fan_condition = race_json["fan_condition"];
    this.fan_gain = race_json["fan_gain"];
    this.thumb_link = race_json["thumb_link"];

    this.date_id = date_text_to_id(this.date);
  }
}

class RaceManager {
  constructor(races_dict) {
    this.race_list = races_dict.map((race_dict, id) => new Race(id, race_dict));
    this.date_id_list = []

    for (var jcs of ['J', 'C', 'S']) {
      for (var month = ((jcs == 'J') ? 7 : 1); month <= 12; month ++) {
        for (var ab of ['A', 'B']) {
          this.date_id_list.push(create_date_id(jcs, month, ab));
        }
      }
    }

    this.date_id_to_race_ids = Object.fromEntries(this.date_id_list.map(date_id => [date_id, []]))
    for (const [id, race] of this.race_list.entries()) {
      this.date_id_to_race_ids[race.date_id].push(id);
    }
  }

  get_race(race_id) {
    return this.race_list[race_id];
  }
}


class Rotation {
  constructor() {
    this.date_id_to_race_id = {};
  }

  set_date_id_to_race_id(date_id_to_race_id) {
    Object.assign(this.date_id_to_race_id, date_id_to_race_id);
  }

  get_race_id(date_id) {
    if (date_id in this.date_id_to_race_id) {
      return this.date_id_to_race_id[date_id];
    }
    return -1;
  }

  select(date_id, race_id) {
    this.date_id_to_race_id[date_id] = race_id;
  }

  get_race_names() {
    return Object.values(
      this.date_id_to_race_id
    ).filter(
      race_id => (race_id != -1)
    ).map(
      race_id => window.race_manager.get_race(race_id).name
    );
  }

  get_classic_race_names() {
    return Object.entries(this.date_id_to_race_id).filter(
      date_id_race_id => (date_id_race_id[0][0] == 'C')
    ).map(
      date_id_race_id => date_id_race_id[1]
    ).filter(
      race_id => (race_id != -1)
    ).map(
      race_id => window.race_manager.get_race(race_id).name
    );
  }

  get_senior_race_names() {
    return Object.entries(this.date_id_to_race_id).filter(
      date_id_race_id => (date_id_race_id[0][0] == 'S')
    ).map(
      date_id_race_id => date_id_race_id[1]
    ).filter(
      race_id => (race_id != -1)
    ).map(
      race_id => window.race_manager.get_race(race_id).name
    );
  }

  get_all_races() {
    return Object.values(
      this.date_id_to_race_id
    ).filter(
      race_id => (race_id != -1)
    ).map(
      race_id => window.race_manager.get_race(race_id)
    );
  }
  count_all_races() {
    return this.get_all_races().length;
  }

  count_track_dist_type(track, dist_type) {
    return this.get_all_races().filter(
      race => (race.track == track && dist_to_text(race.distance) == dist_type)
    ).length;
  }
  count_dirt_g1() {
    return this.get_all_races().filter(
      race => (race.track == "더트" && race.grade == "G I")
    ).length;
  }
  count_dirt() {
    return this.get_all_races().filter(
      race => (race.track == "더트")
    ).length;
  }
  count_basis_dist() {
    return this.get_all_races().filter(
      race => (race.distance % 400 == 0)
    ).length;
  }
  count_non_basis_dist() {
    return this.get_all_races().filter(
      race => (race.distance % 400 != 0)
    ).length;
  }
  count_race_unique_name_filter(race_name_filter) {
    return Array.from(new Set(this.get_all_races().map(
      race => race.name
    ))).filter(race_name => race_name_filter(race_name)).length
  }
  count_race_filter(race_filter) {
    return this.get_all_races().filter(race => race_filter(race)).length
  }
}

function init_race_manager(races_dict) {
  window.race_manager = new RaceManager(races_dict);
  window.rotation = new Rotation();
  window.race_manager_ready();
}

$(function() {
  if (!LOCAL) {
    download_race_info = function() {
      $.ajax({
        url: "/race_info",
        type: "GET",
        contentType: "application/json; charset=utf-8",
        success: function(races_dict) {
          init_race_manager(races_dict);
        },
        error: function(data) {
          alert("Error");
        },
      });
    }
    download_race_info();
  }
  else {
    init_race_manager(local_races_dict);
  }
});

LOCAL = true;
local_races_dict = [
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1000",
    "fan_gain": "6500",
    "grade": "G I",
    "location": "\ud55c\uc2e0",
    "name": "\ud55c\uc2e0 \uc96c\ubc84\ub098\uc77c \ud544\ub9ac\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1021_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1000",
    "fan_gain": "7000",
    "grade": "G I",
    "location": "\ud55c\uc2e0",
    "name": "\uc544\uc0ac\ud788\ubc30 \ud4e8\ucc98\ub7ec\ud2f0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1022_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1000",
    "fan_gain": "7000",
    "grade": "G I",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud638\ud504\ud480 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1024_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "4500",
    "fan_gain": "10500",
    "grade": "G I",
    "location": "\ud55c\uc2e0",
    "name": "\ubc9a\uaf43\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1004_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "4500",
    "fan_gain": "11000",
    "grade": "G I",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc0ac\uce20\ud0a4\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1005_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "5000",
    "fan_gain": "10500",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "NHK \ub9c8\uc77c\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1007_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2400",
    "fan_condition": "6000",
    "fan_gain": "11000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\uc624\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1009_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2400",
    "fan_condition": "6000",
    "fan_gain": "20000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\uc77c\ubcf8 \ub354\ube44 (\ub3c4\ucfc4 \uc6b0\uc900)",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1010_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "15000",
    "fan_gain": "13000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\uc57c\uc2a4\ub2e4 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1011_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2200",
    "fan_condition": "20000",
    "fan_gain": "15000",
    "grade": "G I",
    "location": "\ud55c\uc2e0",
    "name": "\ud0c0\uce74\ub77c\uc988\uce74 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1012_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "4000",
    "fan_gain": "4500",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "\uc7ac\ud32c \ub354\ud2b8 \ub354\ube44",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1102_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "15000",
    "fan_gain": "13000",
    "grade": "G I",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc2a4\ud504\ub9b0\ud130\uc988 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1013_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "20000",
    "fan_gain": "15000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\ud150\ub178\uc0c1 (\uac00\uc744)",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1016_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "7500",
    "fan_gain": "10000",
    "grade": "G I",
    "location": "\uad50\ud1a0",
    "name": "\ucd94\ud654\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1014_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "3000",
    "fan_condition": "7500",
    "fan_gain": "12000",
    "grade": "G I",
    "location": "\uad50\ud1a0",
    "name": "\uad6d\ud654\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1015_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2200",
    "fan_condition": "10000",
    "fan_gain": "10500",
    "grade": "G I",
    "location": "\uad50\ud1a0",
    "name": "\uc5d8\ub9ac\uc790\ubca0\uc2a4 \uc5ec\uc655\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1017_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "12000",
    "fan_gain": "4100",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "JBC \ub808\uc774\ub514\uc2a4 \ud074\ub798\uc2dd",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1103_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "12000",
    "fan_gain": "6000",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "JBC \uc2a4\ud504\ub9b0\ud2b8",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1104_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "12000",
    "fan_gain": "8000",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "JBC \ud074\ub798\uc2dd",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1105_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "15000",
    "fan_gain": "11000",
    "grade": "G I",
    "location": "\uad50\ud1a0",
    "name": "\ub9c8\uc77c \ucc54\ud53c\uc5b8\uc2ed",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1018_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2400",
    "fan_condition": "25000",
    "fan_gain": "30000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\uc7ac\ud32c\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1019_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "12000",
    "fan_gain": "10000",
    "grade": "G I",
    "location": "\uce04\ucfc4",
    "name": "\ucc54\ud53c\uc5b8\uc2a4\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1020_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2500",
    "fan_condition": "25000",
    "fan_gain": "30000",
    "grade": "G I",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc544\ub9ac\ub9c8 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1023_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "12000",
    "fan_gain": "8000",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "\ub3c4\ucfc4 \ub300\uc0c1\uc804",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1106_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "12000",
    "fan_gain": "10000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\ud398\ube0c\ub7ec\ub9ac \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1001_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1200",
    "fan_condition": "15000",
    "fan_gain": "13000",
    "grade": "G I",
    "location": "\uce04\ucfc4",
    "name": "\ud0c0\uce74\ub9c8\uce20\ub178\ubbf8\uc57c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1002_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "20000",
    "fan_gain": "13500",
    "grade": "G I",
    "location": "\ud55c\uc2e0",
    "name": "\uc624\uc0ac\uce74\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1003_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "3200",
    "fan_condition": "20000",
    "fan_gain": "15000",
    "grade": "G I",
    "location": "\uad50\ud1a0",
    "name": "\ud150\ub178\uc0c1 (\ubd04)",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1006_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "10000",
    "fan_gain": "10500",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\ube45\ud1a0\ub9ac\uc544 \ub9c8\uc77c",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1008_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "15000",
    "fan_gain": "13000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\uc57c\uc2a4\ub2e4 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1011_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2200",
    "fan_condition": "20000",
    "fan_gain": "15000",
    "grade": "G I",
    "location": "\ud55c\uc2e0",
    "name": "\ud0c0\uce74\ub77c\uc988\uce74 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1012_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "12000",
    "fan_gain": "6000",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "\uc81c\uc655\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1101_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "15000",
    "fan_gain": "13000",
    "grade": "G I",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc2a4\ud504\ub9b0\ud130\uc988 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1013_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "20000",
    "fan_gain": "15000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\ud150\ub178\uc0c1 (\uac00\uc744)",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1016_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2200",
    "fan_condition": "10000",
    "fan_gain": "10500",
    "grade": "G I",
    "location": "\uad50\ud1a0",
    "name": "\uc5d8\ub9ac\uc790\ubca0\uc2a4 \uc5ec\uc655\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1017_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "12000",
    "fan_gain": "4100",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "JBC \ub808\uc774\ub514\uc2a4 \ud074\ub798\uc2dd",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1103_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "12000",
    "fan_gain": "6000",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "JBC \uc2a4\ud504\ub9b0\ud2b8",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1104_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "12000",
    "fan_gain": "8000",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "JBC \ud074\ub798\uc2dd",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1105_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "15000",
    "fan_gain": "11000",
    "grade": "G I",
    "location": "\uad50\ud1a0",
    "name": "\ub9c8\uc77c \ucc54\ud53c\uc5b8\uc2ed",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1018_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2400",
    "fan_condition": "25000",
    "fan_gain": "30000",
    "grade": "G I",
    "location": "\ub3c4\ucfc4",
    "name": "\uc7ac\ud32c\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1019_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "12000",
    "fan_gain": "10000",
    "grade": "G I",
    "location": "\uce04\ucfc4",
    "name": "\ucc54\ud53c\uc5b8\uc2a4\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1020_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2500",
    "fan_condition": "25000",
    "fan_gain": "30000",
    "grade": "G I",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc544\ub9ac\ub9c8 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1023_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "12000",
    "fan_gain": "8000",
    "grade": "G I",
    "location": "\uc624\uc774",
    "name": "\ub3c4\ucfc4 \ub300\uc0c1\uc804",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_1106_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "375",
    "fan_gain": "3800",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ucf00\uc774\uc624\ubc30 \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2030_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "375",
    "fan_gain": "3800",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\ub370\uc77c\ub9ac\ubc30 \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2032_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1750",
    "fan_gain": "5400",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc57c\uc694\uc774\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2006_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "1750",
    "fan_gain": "5200",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\ud544\ub9ac\uc2a4 \ub808\ubdf0",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2008_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1750",
    "fan_gain": "5200",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\ud2a4\ub9bd\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3018_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1800",
    "fan_condition": "1750",
    "fan_gain": "5400",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc2a4\ud504\ub9c1 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2010_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1750",
    "fan_gain": "5400",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub274\uc9c8\ub79c\ub4dc \ud2b8\ub85c\ud53c",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2013_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "1750",
    "fan_gain": "5200",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ud50c\ub85c\ub77c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2015_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2400",
    "fan_condition": "1800",
    "fan_gain": "5400",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\uccad\uc5fd\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2016_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678",
    "distance": "2200",
    "fan_condition": "1750",
    "fan_gain": "5400",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\uad50\ud1a0 \uc2e0\ubb38\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2017_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "2000",
    "fan_gain": "7000",
    "grade": "G II",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc0bf\ud3ec\ub85c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2020_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\uc13c\ud1a0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2021_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "1750",
    "fan_gain": "5200",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\ub85c\uc988 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2022_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2400",
    "fan_condition": "1750",
    "fan_gain": "5400",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\uace0\ubca0 \uc2e0\ubb38\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2024_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2200",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc62c \ucee4\uba38\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2025_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2200",
    "fan_condition": "1750",
    "fan_gain": "5400",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc13c\ud2b8\ub77c\uc774\ud2b8 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2023_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ub9c8\uc774\ub2c8\uce58 \uc655\uad00",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2026_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2400",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\uad50\ud1a0 \ub300\uc0c1\uc804",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2027_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "1800",
    "fan_gain": "5500",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ud6c4\uce04 \uc6b0\ub9c8\ubb34\uc2a4\uba54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2028_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\uc2a4\uc644 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2029_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ud6c4\uc9c0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3058_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2500",
    "fan_condition": "1900",
    "fan_gain": "5700",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\uc544\ub974\ud5e8\ud2f0\ub098 \uacf5\ud654\uad6d\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2031_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "3600",
    "fan_condition": "2000",
    "fan_gain": "6200",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc2a4\ud14c\uc774\uc5b4\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2033_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\ud55c\uc2e0\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2034_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2400",
    "fan_condition": "1800",
    "fan_gain": "5700",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\ub2db\ucf00\uc774 \uc2e0\ucd98\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2001_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "1800",
    "fan_gain": "5500",
    "grade": "G II",
    "location": "\uce04\ucfc4",
    "name": "\ud1a0\uce74\uc774 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2002_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2200",
    "fan_condition": "1900",
    "fan_gain": "6200",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc544\uba54\ub9ac\uce74 JCC",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2003_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678",
    "distance": "2200",
    "fan_condition": "1900",
    "fan_gain": "6200",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\uad50\ud1a0 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2004_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1800",
    "fan_condition": "1900",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub098\uce74\uc57c\ub9c8 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2005_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\uce04\ucfc4",
    "name": "\ud0a8\ucf54\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2007_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "3000",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\ud55c\uc2e0 \ub300\uc0c1\uc804",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2009_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2500",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub2db\ucf00\uc774\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2011_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1800",
    "fan_gain": "5500",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\ud55c\uc2e0 \uc6b0\ub9c8\ubb34\uc2a4\uba54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2012_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\ub9c8\uc77c\ub7ec\uc2a4\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2014_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ucf00\uc774\uc624\ubc30 \uc2a4\ud504\ub9c1\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2018_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2500",
    "fan_condition": "1800",
    "fan_gain": "5700",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\uba54\uad6c\ub85c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2019_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "2000",
    "fan_gain": "7000",
    "grade": "G II",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc0bf\ud3ec\ub85c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2020_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\uc13c\ud1a0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2021_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2200",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc62c \ucee4\uba38\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2025_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ub9c8\uc774\ub2c8\uce58 \uc655\uad00",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2026_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "2400",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\uad50\ud1a0 \ub300\uc0c1\uc804",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2027_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "1800",
    "fan_gain": "5500",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ud6c4\uce04 \uc6b0\ub9c8\ubb34\uc2a4\uba54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2028_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\uad50\ud1a0",
    "name": "\uc2a4\uc644 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2029_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "1900",
    "fan_gain": "5900",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\ud6c4\uc9c0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3058_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2500",
    "fan_condition": "1900",
    "fan_gain": "5700",
    "grade": "G II",
    "location": "\ub3c4\ucfc4",
    "name": "\uc544\ub974\ud5e8\ud2f0\ub098 \uacf5\ud654\uad6d\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2031_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "3600",
    "fan_condition": "2000",
    "fan_gain": "6200",
    "grade": "G II",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc2a4\ud14c\uc774\uc5b4\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2033_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "2000",
    "fan_gain": "6700",
    "grade": "G II",
    "location": "\ud55c\uc2e0",
    "name": "\ud55c\uc2e0\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_2034_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "3100",
    "grade": "G III",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ud558\ucf54\ub2e4\ud14c \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3041_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "3100",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub2c8\uc774\uac00\ud0c0 \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3049_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "3100",
    "grade": "G III",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc0bf\ud3ec\ub85c \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3051_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "3100",
    "grade": "G III",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ucf54\ucfe0\ub77c \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3052_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "3300",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\uc0ac\uc6b0\ub514\uc544\ub77c\ube44\uc544 \ub85c\uc584\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3057_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2900",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\uc544\ub974\ud14c\ubbf8\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3059_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2900",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\ud310\ud0c0\uc9c0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3060_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "3300",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ub3c4\ucfc4 \uc2a4\ud3ec\uce20\ubc30 \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3064_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "3300",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\uad50\ud1a0 \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3065_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1000",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\uc2e0\uc794 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3003_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "750",
    "fan_gain": "3500",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud398\uc5b4\ub9ac \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3004_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1000",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ucf00\uc774\uc138\uc774\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3006_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "1000",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\ud0a4\uc0ac\ub77c\uae30\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3009_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "750",
    "fan_gain": "3500",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ud038\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3011_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "1000",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ucfc4\ub3c4\ud1b5\uc2e0\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3012_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\ud314\ucf58 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3021_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1800",
    "fan_condition": "750",
    "fan_gain": "3500",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud50c\ub77c\uc6cc\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3022_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\ub9c8\uc774\ub2c8\uce58\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3023_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\uc54c\ub9c1\ud134\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3016_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\uc811\uc2dc\uaf43 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4050_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\ub098\ub8e8\uc624 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3030_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\uba38\uba54\uc774\ub4dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3031_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\uc5e1\uc12c\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3032_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ud558\ucf54\ub2e4\ud14c \uc2a4\ud504\ub9b0\ud2b8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3034_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "750",
    "fan_gain": "3500",
    "grade": "G III",
    "location": "\uc720\ub2c8\ucf58",
    "name": "\uc720\ub2c8\ucf58 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3033_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "CBC\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3035_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\ud504\ub85c\uc2dc\uc628 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3037_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\uce60\uc11d\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3038_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ud558\ucf54\ub2e4\ud14c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3039_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ub77c\ub514\uc624 NIKKEI\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3036_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\uce04\ucfc4 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3040_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc9c1\uc120",
    "distance": "1000",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\uc774\ube44\uc2a4 \uc11c\uba38 \ub300\uc2dc",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3042_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ud038 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3043_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ucf54\ucfe0\ub77c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3044_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\uc138\ud0a4\uc57c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3046_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc5d8\ub984 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3047_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "1250",
    "fan_gain": "4000",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub808\uc624\ud30c\ub4dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3045_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ud0a4\ud0c0\ud050\uc288 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3048_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ud0a8\ub79c\ub4dc\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3050_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub2c8\uc774\uac00\ud0c0 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3053_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ucf00\uc774\uc138\uc774\ubc30 \uc624\ud140 \ud578\ub514\ucea1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3055_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1000",
    "fan_gain": "3500",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uac1c\ubbf8\ucde8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3054_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\uc2dc\ub9ac\uc6b0\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3056_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "750",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\ubbf8\uc57c\ucf54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3061_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ubb34\uc0ac\uc2dc\ub178 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3062_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3063_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\ucf00\uc774\ud55c\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3066_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\ucc4c\ub9b0\uc9c0\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3067_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\uce04\ub2c8\uce58 \uc2e0\ubb38\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3068_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uce74\ud3a0\ub77c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3069_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud130\ud0a4\uc11d \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3070_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\uad50\ud1a0 \uae08\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3001_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub098\uce74\uc57c\ub9c8 \uae08\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3002_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "750",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\uc544\uc774\uce58\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3005_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\uc2e4\ud06c\ub85c\ub4dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3007_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "1000",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ub124\uae30\uc2dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3008_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ub3c4\ucfc4 \uc2e0\ubb38\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3010_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "750",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\uad50\ud1a0 \uc6b0\ub9c8\ubb34\uc2a4\uba54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3013_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "3400",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ub2e4\uc774\uc544\ubaac\ub4dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3014_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ucf54\ucfe0\ub77c \ub300\uc0c1\uc804",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3015_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\ud55c\ud050\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3017_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc624\uc158 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3019_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1800",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub098\uce74\uc57c\ub9c8 \uc6b0\ub9c8\ubb34\uc2a4\uba54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3020_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub9c8\uce58 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3024_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub354\ube44 \uacbd \ucc4c\ub9b0\uc9c0 \ud2b8\ub85c\ud53c",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3025_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\uc548\ud0c0\ub808\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3026_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8 \uc6b0\ub9c8\ubb34\uc2a4\uba54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3027_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub2c8\uc774\uac00\ud0c0 \ub300\uc0c1\uc804",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3028_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1900",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\ud5e4\uc774\uc548 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3029_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\ub098\ub8e8\uc624 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3030_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\uba38\uba54\uc774\ub4dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3031_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\uc5e1\uc12c\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3032_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ud558\ucf54\ub2e4\ud14c \uc2a4\ud504\ub9b0\ud2b8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3034_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "CBC\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3035_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\ud504\ub85c\uc2dc\uc628 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3037_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\uce60\uc11d\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3038_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ud558\ucf54\ub2e4\ud14c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3039_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\uce04\ucfc4 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3040_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc9c1\uc120",
    "distance": "1000",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\uc774\ube44\uc2a4 \uc12c\uba38 \ub300\uc2dc",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3042_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ud038 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3043_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ucf54\ucfe0\ub77c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3044_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\uc138\ud0a4\uc57c \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3046_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc5d8\ub984 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3047_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ud0a4\ud0c0\ud050\uc288 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3048_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ud0a8\ub79c\ub4dc\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3050_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub2c8\uc774\uac00\ud0c0 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3053_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ucf00\uc774\uc138\uc774\ubc30 \uc624\ud140 \ud578\ub514\ucea1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3055_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\uc2dc\ub9ac\uc6b0\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3056_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "750",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\ubbf8\uc57c\ucf54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3061_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "1250",
    "fan_gain": "3800",
    "grade": "G III",
    "location": "\ub3c4\ucfc4",
    "name": "\ubb34\uc0ac\uc2dc\ub178 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3062_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8 \uae30\ub150",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3063_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "1250",
    "fan_gain": "3900",
    "grade": "G III",
    "location": "\uad50\ud1a0",
    "name": "\ucf00\uc774\ud55c\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3066_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\ud55c\uc2e0",
    "name": "\ucc4c\ub9b0\uc9c0\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3067_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "1500",
    "fan_gain": "4100",
    "grade": "G III",
    "location": "\uce04\ucfc4",
    "name": "\uce04\ub2c8\uce58 \uc2e0\ubb38\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3068_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uce74\ud3a0\ub77c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3069_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "1000",
    "fan_gain": "3600",
    "grade": "G III",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud130\ud0a4\uc11d \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_3070_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\uce04\ucfc4",
    "name": "\uce04\ucfc4 \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4068_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub2ec\ub9ac\uc544\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4070_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ud53c\ub2c9\uc2a4\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4074_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ucf54\uc2a4\ubaa8\uc2a4\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4075_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1500",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ud074\ub85c\ubc84\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4077_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc740\ubc29\uc6b8\uaf43\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4083_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ub4e4\uad6d\ud654 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4085_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc6b0\uc120\uad6d\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4501_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ub3c4\ub77c\uc9c0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4087_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ubd80\uc6a9\uaf43 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4088_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud64d\ucd08 \uc2a4\ucf00\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4089_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc0ac\ud504\ub780\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4502_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ub2e8\ud48d \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4093_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uad50\ud1a0",
    "name": "\uc6a9\ub2f4\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4503_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uad50\ud1a0",
    "name": "\uc790\uad6d\ud654\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4504_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ud50c\ub77c\ud0c0\ub108\uc2a4\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4505_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1700",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc544\uc774\ube44 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4096_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1700",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc0ac\ucca0\uc465 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4099_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uad50\ud1a0",
    "name": "\ud328\ub7ad\uc774\uaf43\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4506_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8 \uc8fc\ub2c8\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4103_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ubc31\uc77c\ucd08 \ud2b9\ubcc4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4507_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\uae08\ubaa9\uc11c \ud2b9\ubcc4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4508_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc0ac\ub791\ucd08\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4509_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uad50\ud1a0",
    "name": "\ud669\uad6d\ud654\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4510_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uad50\ud1a0",
    "name": "\uac10\ud0d5\ub098\ubb34\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4511_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc801\uc1a1\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4512_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uad50\ud1a0",
    "name": "\ucd94\uba85\uad6d\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4513_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uce74\ud2c0\ub808\uc57c\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4514_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ubca0\uace0\ub2c8\uc544\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4515_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uad50\ud1a0",
    "name": "\ubc31\uad6d\ud654\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4516_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ubaa8\ub780\ucc44\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4517_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uce04\ucfc4",
    "name": "\uae08\uc1a1\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4518_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ud55c\uc2e0",
    "name": "\ubc31\ub7c9\uae08\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4519_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud751\uc1a1\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4520_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc5d0\ub9ac\uce74\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4521_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uce04\ucfc4",
    "name": "\ud138\uba38\uc704\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4522_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud638\ub791\uac00\uc2dc\ub098\ubb34\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4523_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc0b0\ub2e4\ud654\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4524_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\uce04\ucfc4",
    "name": "\uaca8\uc6b8\ub3d9\ubc31\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4525_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "1600",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud06c\ub9ac\uc2a4\ub9c8\uc2a4 \ub85c\uc988 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4114_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc8fc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1000",
    "grade": "Pre-OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc8fd\uc808\ucd08\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4526_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc8fc\ub2c8\uc5b4\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4002_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ud64d\ub9e4\ud654 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4007_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc640\uce74\uace0\ub9c8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4009_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ud06c\ub85c\ucee4\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4012_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc5d8\ud540 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4014_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1900",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ud788\uc544\uc2e0\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4018_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2200",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc81c\ube44\uaf43 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4020_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ub9c8\uac00\ub81b \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4032_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc544\ub124\ubaa8\ub124 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4024_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1800",
    "grade": "OP",
    "location": "\uce04\ucfc4",
    "name": "\uc2b9\ub8e1 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4025_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc0c8\uc78e \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4027_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1800",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ubcf5\ub8e1 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4033_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ubb3c\ub9dd\ucd08\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4035_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ubc00\uac10 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4039_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "1800",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ub2e8\uc624 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4042_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc2a4\uc704\ud2b8\ud53c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4043_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ud504\ub9b0\uc2dc\ud384 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4045_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "1800",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uccad\ub8e1 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4052_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "1900",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ubd09\ucd94 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4054_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2000",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ubc31\ubc31\ud569 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4056_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ud150\ud3ec\uc0b0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4060_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2100",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc2ac\ub808\uc774\ud504\ub2c8\ub974 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4119_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc544\ud560 \ud14c\ucf00 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4059_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc694\ub098\uace0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4061_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\uc624\ub204\ub9c8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4062_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ud30c\ub77c\ub2e4\uc774\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4063_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc0b0\ub178\ubbf8\uc57c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4120_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ud1a0\ubaa8\uc5d0\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4064_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ub9c8\ub9b0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4065_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\uce04\ucfc4",
    "name": "\ub098\uace0\uc57c \ucca0\ub3c4\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4066_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8TV \uc624\ud508",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4069_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2600",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc0bf\ud3ec\ub85c \ub2db\ucf00\uc774 \uc624\ud508",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4071_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "UHB\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4072_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\uc544\uc18c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4073_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\ub2c8\uc774\uce74\ud0c0",
    "name": "\uac04\uc5d0\uce20 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4121_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "NST\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4076_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "BSN\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4079_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ucf54\ucfe0\ub77c \ub2db\ucf00\uc774 \uc624\ud508",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4080_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub530\uc624\uae30 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4081_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2600",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ub450\ub8e8\ubbf8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4082_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc5d0\ub2c8\ud504 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4084_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub77c\ub514\uc624 \uc77c\ubcf8\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4086_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ud3ec\ud2b8\uc544\uc77c\ub79c\ub4dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4090_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub098\uac00\uce20\ud0a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4122_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc624\ud314 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4091_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uadf8\ub9b0 \ucc44\ub110\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4092_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc625\ud1a0\ubc84 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4094_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\uc2e0\uc5d0\uce20 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4095_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc6b0\uc988\ub9c8\uc0ac \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4123_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ubb34\ub85c\ub9c8\uce58 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4097_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2100",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ube0c\ub77c\uc9c8\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4098_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uce74\uc2dc\uc624\ud398\uc774\uc544 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4100_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc9c1\uc120",
    "distance": "1000",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub8e8\ubbf8\uc5d0\ub974 \uc624\ud140 \ub300\uc2dc",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4101_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "ORO\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4102_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc548\ub4dc\ub85c\uba54\ub2e4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4104_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ub3d9\uc9d3\ub2ec \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4105_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8 \ubbfc\uc6b0\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4106_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uce90\ud53c\ud0c8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4107_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc624\ud140 \ub9ac\ud504 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4108_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub77c\ud53c\uc2a4 \ub77c\uc904\ub9ac \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4109_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc123\ub2ec \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4110_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ub9ac\uac94 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4111_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ud0c4\uc790\ub098\uc774\ud2b8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4112_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub514\uc148\ubc84 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4113_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uac24\ub7ed\uc2dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4115_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\ud074\ub798\uc2dd\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ubca0\ud154\uac8c\uc6b0\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4116_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "3000",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ub9cc\uc5fd \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4001_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc694\ub3c4 \ub2e8\uac70\ub9ac \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4003_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ud3f4\ub8e9\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4004_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc7ac\ub274\uc5b4\ub9ac \uc2a4\ucf00\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4005_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\uba00",
    "name": "\ub274 \uc774\uc5b4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4006_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\uba00",
    "name": "\uce74\ubc99\ud074 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4010_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ud50c\ub808\uc774\uc544\ub370\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4008_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 1\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc2dc\ub77c\ud6c4\uc9c0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4011_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc57c\ub9c8\ud1a0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4013_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ub77c\ucfe0\uc694 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4015_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1900",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc54c\ub370\ubc14\ub780 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4016_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ubc38\ub7f0\ud0c0\uc778 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4017_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 2\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc18c\ubd80 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4019_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc624\uc0ac\uce74\uc131 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4021_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ud3f4\ub77c\ub9ac\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4022_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ub2c8\uac00\uc640 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4023_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub3d9\ud48d \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4026_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uce58\ubc14 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4028_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 3\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ub86f\ucf54 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4030_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ucf54\ub784 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4031_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ucf00\uc774\uc694 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4036_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ucd98\ub8b0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4037_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8 \ubbfc\ubcf4\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4038_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\uc544\uc988\ub9c8\ucf54\ud6c4\uc9c0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4118_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc624\uc544\uc2dc\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4040_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 4\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ud150\ub178\uc0b0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4041_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ud0c0\ub2c8\uac00\uc640\ub2e4\ucf00 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4044_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2400",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uba54\ud2b8\ub85c\ud3f4\ub9ac\ud0c4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4046_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ucfe0\ub77c\ub9c8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4047_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2100",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ube0c\ub9b4\ub9ac\uc5b8\ud2b8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4048_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ubbf8\uc57c\ucf54 \uc624\uc9c0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4049_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ub9bf\ud1a0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4051_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uba54\uc774 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4053_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc9c1\uc120",
    "distance": "1000",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\uc704\ud0c0\ucc9c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4055_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ub290\ud2f0\ub098\ubb34 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4057_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 5\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc544\uc988\uce58\uc131 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4058_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ud150\ud3ec\uc0b0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4060_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2100",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc2ac\ub808\uc774\ud504\ub2c8\ub974 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4119_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc544\ud560 \ud14c\ucf00 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4059_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc694\ub098\uace0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4061_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\uc624\ub204\ub9c8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4062_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ud30c\ub77c\ub2e4\uc774\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4063_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 6\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc0b0\ub178\ubbf8\uc57c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4120_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ud1a0\ubaa8\uc5d0\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4064_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud558\ucf54\ub2e4\ud14c",
    "name": "\ub9c8\ub9b0 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4065_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\uce04\ucfc4",
    "name": "\ub098\uace0\uc57c \ucca0\ub3c4\ubc30",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4066_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 7\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8TV \uc624\ud508",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4069_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2600",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\uc0bf\ud3ec\ub85c \ub2db\ucf00\uc774 \uc624\ud508",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4071_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "UHB\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4072_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\uc544\uc18c \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4073_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\ub2c8\uc774\uce74\ud0c0",
    "name": "\uac04\uc5d0\uce20 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4121_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "NST\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4076_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "BSN\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4079_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\ucf54\ucfe0\ub77c",
    "name": "\ucf54\ucfe0\ub77c \ub2db\ucf00\uc774 \uc624\ud508",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4080_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 8\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub530\uc624\uae30 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4081_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "2600",
    "fan_condition": "350",
    "fan_gain": "2400",
    "grade": "OP",
    "location": "\uc0bf\ud3ec\ub85c",
    "name": "\ub450\ub8e8\ubbf8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4082_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uc5d0\ub2c8\ud504 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4084_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub77c\ub514\uc624 \uc77c\ubcf8\uc0c1",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4086_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ud3ec\ud2b8\uc544\uc77c\ub79c\ub4dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4090_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 9\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub098\uac00\uce20\ud0a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4122_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc624\ud314 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4091_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uadf8\ub9b0 \ucc44\ub110\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4092_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uc625\ud1a0\ubc84 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4094_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc88c, \ub0b4\uce21",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\uc2e0\uc5d0\uce20 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4095_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc6b0\uc988\ub9c8\uc0ac \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4123_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\ubb34\ub85c\ub9c8\uce58 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4097_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "2100",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ube0c\ub77c\uc9c8\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4098_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uce74\uc2dc\uc624\ud398\uc774\uc544 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4100_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 10\uc6d4 \ud6c4\ubc18",
    "direction": "\uc9c1\uc120",
    "distance": "1000",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub2c8\uc774\uac00\ud0c0",
    "name": "\ub8e8\ubbf8\uc5d0\ub974 \uc624\ud140 \ub300\uc2dc",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4101_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \uc804\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "ORO\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4102_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "2000",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc548\ub4dc\ub85c\uba54\ub2e4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4104_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\ub3d9\uc9d3\ub2ec \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4105_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1700",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud6c4\ucfe0\uc2dc\ub9c8",
    "name": "\ud6c4\ucfe0\uc2dc\ub9c8 \ubbfc\uc6b0\ucef5",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4106_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc88c",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub3c4\ucfc4",
    "name": "\uce90\ud53c\ud0c8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4107_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 11\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\uad50\ud1a0",
    "name": "\uc624\ud140 \ub9ac\ud504 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4108_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub77c\ud53c\uc2a4 \ub77c\uc904\ub9ac \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4109_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\uc123\ub2ec \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4110_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \uc678\uce21",
    "distance": "1600",
    "fan_condition": "350",
    "fan_gain": "2500",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ub9ac\uac94 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4111_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1200",
    "fan_condition": "350",
    "fan_gain": "2300",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ud0c4\uc790\ub098\uc774\ud2b8 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4112_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \uc804\ubc18",
    "direction": "\uc6b0, \ub0b4\uce21",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2600",
    "grade": "OP",
    "location": "\ub098\uce74\uc57c\ub9c8",
    "name": "\ub514\uc148\ubc84 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4113_00.png",
    "track": "\uc794\ub514"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1400",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\uac24\ub7ed\uc2dc \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4115_00.png",
    "track": "\ub354\ud2b8"
  },
  {
    "date": "\uc2dc\ub2c8\uc5b4\uae09 12\uc6d4 \ud6c4\ubc18",
    "direction": "\uc6b0",
    "distance": "1800",
    "fan_condition": "350",
    "fan_gain": "2200",
    "grade": "OP",
    "location": "\ud55c\uc2e0",
    "name": "\ubca0\ud154\uac8c\uc6b0\uc2a4 \uc2a4\ud14c\uc774\ud06c\uc2a4",
    "thumb_link": "./static/thum_race_rt/thum_race_rt_000_4116_00.png",
    "track": "\ub354\ud2b8"
  }
];
