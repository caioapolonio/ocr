// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_new_kree.sql';
import m0001 from './0001_huge_oracle.sql';
import m0002 from './0002_busy_risque.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  