// FluxSQL - SQL 生成解析模块
function parseSQL(sql) {
  const result = [];
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // CREATE TABLE
  const createReg = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\)\s*(?:ENGINE\s*=\s*\w+\s*)?(?:CHARSET\s*=\s*\w+\s*)?(?:COMMENT\s*=\s*'([^']*)')?\s*;/gi;
  let m;
  while ((m = createReg.exec(sql)) !== null) {
    const t = { name: m[1], comment: m[3] || '', fields: parseFields(m[2]) };
    // MySQL: 表注释在 CREATE TABLE 末尾
    result.push(t);
  }
  // Oracle/PG: COMMENT ON TABLE
  const tableCommentReg = /COMMENT\s+ON\s+TABLE\s+(\w+)\s+IS\s+'([^']*)'/gi;
  while ((m = tableCommentReg.exec(sql)) !== null) {
    const t = result.find(x => x.name.toUpperCase() === m[1].toUpperCase());
    if (t && !t.comment) t.comment = m[2];
  }
  // Oracle/PG: COMMENT ON COLUMN
  const colCommentReg = /COMMENT\s+ON\s+COLUMN\s+(\w+)\.(\w+)\s+IS\s+'([^']*)'/gi;
  while ((m = colCommentReg.exec(sql)) !== null) {
    const t = result.find(x => x.name.toUpperCase() === m[1].toUpperCase());
    if (t) { const f = t.fields.find(f => f.name.toUpperCase() === m[2].toUpperCase()); if (f) f.comment = m[3]; }
  }
  // SQL Server: sp_addextendedproperty for table
  const ssTableReg = /sp_addextendedproperty\s+'MS_Description',\s*N?'([^']*)',\s*'SCHEMA',\s*'(\w+)',\s*'TABLE',\s*'(\w+)'/gi;
  while ((m = ssTableReg.exec(sql)) !== null) {
    const t = result.find(x => x.name.toLowerCase() === m[3].toLowerCase());
    if (t && !t.comment) t.comment = m[1];
  }
  // SQL Server: sp_addextendedproperty for column
  const ssColReg = /sp_addextendedproperty\s+'MS_Description',\s*N?'([^']*)',\s*'SCHEMA',\s*'(\w+)',\s*'TABLE',\s*'(\w+)',\s*'COLUMN',\s*'(\w+)'/gi;
  while ((m = ssColReg.exec(sql)) !== null) {
    const t = result.find(x => x.name.toLowerCase() === m[3].toLowerCase());
    if (t) { const f = t.fields.find(f => f.name.toLowerCase() === m[4].toLowerCase()); if (f) f.comment = m[1]; }
  }
  return result;
}

function parseFields(body) {
  const fields = [];
  const lines = splitFields(body);
  for (let raw of lines) {
    raw = raw.trim();
    if (!raw) continue;
    // 剥离段首的纯注释行（保留内联注释中的字段定义）
    raw = raw.replace(/^(?:--[^\n]*\n\s*)+/, '').trim();
    if (!raw || raw.startsWith('--')) continue;
    if (/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|INDEX|KEY)\s/i.test(raw)) continue;
    let lineComment = '';
    const inlineM = raw.match(/--\s*(.*)/);
    if (inlineM) { lineComment = inlineM[1].trim(); raw = raw.replace(/--.*/, '').trim(); }
    // MySQL: COMMENT 'xxx'
    let mySqlComment = '';
    const commentM = raw.match(/\bCOMMENT\s+'([^']*)'\s*$/i);
    if (commentM) { mySqlComment = commentM[1]; raw = raw.replace(/\bCOMMENT\s+'[^']*'\s*$/i, '').trim(); }

    if (!raw) continue;
    const fm = raw.match(/^(?:`([^`]+)`|(\w+))\s+([A-Z_0-9]+(?:\s*\([^)]*\))?(?:\(\s*\))?(?:\s+UNSIGNED)?)\s*(.*)/i);
    if (!fm) continue;
    let name = fm[1] || fm[2];
    let type = fm[3].trim().toUpperCase();
    // 补全 UNSIGNED 等
    const rest = (fm[4] || '').trim();
    if (/UNSIGNED/i.test(rest) && !type.includes('UNSIGNED')) type += ' UNSIGNED';
    const restUpper = rest.toUpperCase();
    const notNull = /NOT\s+NULL/.test(restUpper);
    const pk = /PRIMARY\s+KEY/.test(restUpper);
    const autoInc = /AUTO_INCREMENT/i.test(restUpper);
    const identity = /IDENTITY/i.test(restUpper);
    let defaultVal = '';
    const defM = rest.match(/DEFAULT\s+(?:N?)'(.*?)'/i) || rest.match(/DEFAULT\s+(\S+)/i);
    if (defM) defaultVal = defM[1] || defM[0].replace(/DEFAULT\s+/i, '');
    // 处理 N'...' 格式
    if (/DEFAULT\s+N'/i.test(rest)) {
      const nd = rest.match(/DEFAULT\s+N'([^']*)'/i);
      if (nd) defaultVal = "N'" + nd[1] + "'";
    }

    let comment = mySqlComment || lineComment;
    fields.push({ id: uid(), name, type, nullable: !notNull, pk, defaultVal, comment, autoInc, identity });
  }
  return fields;
}

function splitFields(body) {
  const result = []; let depth = 0, cur = '';
  let inLineComment = false; // 当前是否在行注释中（-- 开头到行末）
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    // 检测行注释起始：连续两个 - 且不在引号内
    if (!inLineComment && ch === '-' && i + 1 < body.length && body[i + 1] === '-') {
      inLineComment = true;
      cur += ch;
    }
    // 行注释在换行时结束
    else if (inLineComment && (ch === '\n' || ch === '\r')) {
      inLineComment = false;
      cur += ch;
    }
    else if (inLineComment) {
      // 在行注释内，逗号不作为字段分隔符，直接追加
      cur += ch;
    }
    else if (ch === '(') { depth++; cur += ch; }
    else if (ch === ')') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) result.push(cur);
  return result;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ══════════════════════════════════════════
// SQL 生成器（多方言）
// ══════════════════════════════════════════
function generateTableSQL(t) {
  if (!t || !t.fields.length) return `-- 表 ${t ? t.name : ''} 暂无字段`;
  const d = getDialect();
  let sql = '';
  // DROP TABLE 语句（各方言适配）
  if (currentDialect === 'oracle') {
    sql += `DROP TABLE ${t.name} PURGE;\n`;
  } else if (currentDialect === 'sqlserver') {
    sql += `IF OBJECT_ID(N'${t.name}', N'U') IS NOT NULL DROP TABLE ${t.name};\n`;
  } else {
    // MySQL / PostgreSQL
    sql += `DROP TABLE IF EXISTS ${t.name};\n`;
  }
  if (t.comment && !d.comment.tableInCreate) sql += `-- ${t.comment}\n`;
  sql += `CREATE TABLE ${t.name} (\n`;
  const lines = t.fields.map((f, i) => {
    let line = `    ${f.name} ${f.type}`;
    // DEFAULT 在 NOT NULL 前（SQL 标准语法）
    if (f.defaultVal) line += ` DEFAULT ${f.defaultVal}`;
    if (f.pk) line += ' NOT NULL PRIMARY KEY';
    else if (!f.nullable) line += ' NOT NULL';
    if (f.autoInc) line += ' AUTO_INCREMENT';
    if (f.identity) line += ' IDENTITY(1,1)';
    const comma = i < t.fields.length - 1 ? ',' : '';
    if (d.comment.columnInCreate && f.comment) {
      // MySQL: COMMENT 是字段定义的一部分，逗号在注释后
      line += ` COMMENT '${f.comment}'` + comma;
    } else if (d.comment.inline && f.comment) {
      // Oracle/PG/SQL Server: -- 是行尾注释，逗号必须在注释符号之前
      line += comma + d.comment.inline(f);
    } else {
      line += comma;
    }
    return line;
  });
  sql += lines.join('\n') + '\n)';
  // MySQL: 表注释在括号后
  if (d.comment.tableInCreate && t.comment) {
    sql += ` COMMENT='${t.comment}'`;
  }
  sql += ';\n';

  // 后置注释语句
  if (d.comment.tableAfter && t.comment) {
    sql += d.comment.tableAfter(t) + '\n';
  }
  if (d.comment.columnAfter) {
    const commentCols = t.fields.filter(f => f.comment && !d.comment.columnInCreate);
    if (commentCols.length) {
      sql += '\n' + commentCols.map(f => d.comment.columnAfter(t, f)).join('\n') + '\n';
    }
  }
  return sql;
}

function generateAllSQL() {
  const SEPARATOR = '\x00TABLE_BREAK\x00';
  let sql = tables.map(t => generateTableSQL(t)).join(SEPARATOR);
  // SQL Server: 加 GO 分隔
  if (currentDialect === 'sqlserver') {
    sql = sql.split(SEPARATOR).map(block => block.trim()).filter(Boolean).join('\n\nGO\n\n') + '\n\nGO';
  } else {
    sql = sql.split(SEPARATOR).join('\n\n');
  }
  return sql;
}

// ══════════════════════════════════════════
// SQL 校验器
// ══════════════════════════════════════════

// 各方言保留字
const RESERVED_WORDS = {
  oracle: ['ACCESS','ACCOUNT','ACTIVATE','ADD','ADMIN','ADVISE','AFTER','ALL','ALL_ROWS','ALLOCATE','ALTER','ALWAYS','ANALYZE','AND','ANY','ARCHIVE','ARCHIVELOG','ARRAY','AS','ASC','AT','ATTRIBUTE','AUDIT','AUTHID','AUTO','AUTOMATIC','AUTONOMOUS_TRANSACTION','AVG','BACKUP','BECOME','BEFORE','BEGIN','BETWEEN','BFILE','BITMAP','BLOB','BLOCK','BODY','BY','CACHE','CACHE_INSTANCES','CALL','CANCEL','CARDINALITY','CASCADE','CASE','CAST','CATEGORY','CHAIN','CHANGE','CHAR','CHAR_CS','CHARACTER','CHECK','CHECKPOINT','CHOOSE','CHR','CLOB','CLOSE','CLUSTER','COALESCE','COLLECT','COLUMN','COLUMNS','COMMENT','COMMIT','COMMITTED','COMPATIBILITY','COMPILE','COMPLETE','COMPOSITE_LIMIT','COMPRESS','COMPUTE','CONNECT','CONNECT_TIME','CONSTRAINT','CONSTRAINTS','CONTAINER','CONTENT','CONTINUE','CONTROLFILE','CONVERT','CORRUPTION','COST','CPU_PER_CALL','CPU_PER_SESSION','CREATE','CURRENT','CURRENT_USER','CURSOR','CYCLE','DANGLING','DATABASE','DATAFILE','DATAFILES','DATE','DBA','DBHIGH','DBLOW','DBMAC','DEALLOCATE','DEBUG','DEC','DECIMAL','DECLARE','DEFAULT','DEFERRABLE','DEFERRED','DEGREE','DELETE','DEMAND','DEREF','DESC','DIRECTORY','DISABLE','DISCONNECT','DISMOUNT','DISPOSE','DISTINCT','DISTINGUISHED','DO','DOUBLE','DROP','DUMP','DYNAMIC','EACH','ELSE','ENABLE','END','ENFORCE','ENTRY','ESCAPE','EXCEPT','EXCEPTIONS','EXCHANGE','EXCLUDE','EXCLUSIVE','EXECUTE','EXISTS','EXPIRE','EXPLAIN','EXTENT','EXTENTS','EXTERNAL','FAILED_LOGIN_ATTEMPTS','FAST','FETCH','FILE','FEW','FIRST','FLUSH','FOLLOWING','FOR','FORCE','FOREIGN','FREELIST','FREELISTS','FROM','FULL','FUNCTION','GENERATED','GLOBAL','GLOBALLY','GLOBAL_NAME','GRANT','GROUP','GROUPS','HASH','HAVING','HEADER','HEAP','HIGH','HOUR','IDENTIFIED','IDENTIFIER','IDLE_TIME','IMMEDIATE','IN','INCLUDING','INCREMENT','INDEX','INDEXED','INDEXES','INDICATOR','INDICES','INITIAL','INITIALLY','INITRANS','INSERT','INSTANCE','INSTANCES','INSTEAD','INT','INTEGER','INTERMEDIATE','INTERSECT','INTO','IS','ISOLATION','ISOLATION_LEVEL','KEEP','KEY','KILL','LABEL','LANGUAGE','LARGE','LAST','LATERAL','LAYER','LEVEL','LIBRARY','LIKE','LIMIT','LINK','LIST','LOB','LOCAL','LOCK','LOCKED','LOG','LOGFILE','LOGGING','LOGICAL','LOGICAL_READS_PER_CALL','LOGICAL_READS_PER_SESSION','LONG','LOOP','MANAGE','MASTER','MAX','MAXDATAFILES','MAXEXTENTS','MAXINSTANCES','MAXLOGFILES','MAXLOGHISTORY','MAXLOGMEMBERS','MAXSIZE','MAXTRANS','MAXVALUE','MIN','MINEXTENTS','MINUS','MINIMUM','MINVALUE','MLSLABEL','MODE','MODIFY','MODULE','MONEY','MONTH','MOUNT','MOVE','MTS_DISPATCHERS','MULTISET','NATIONAL','NCHAR','NCHAR_CS','NCLOB','NEED','NESTED','NETWORK','NEW','NEXT','NO','NOAUDIT','NOCACHE','NOCOMPRESS','NOCYCLE','NOLOGGING','NOMAXVALUE','NOMINVALUE','NONE','NOORDER','NOOVERRIDE','NOPARALLEL','NOPROMPT','NOREVERSE','NORMAL','NOSORT','NOT','NOTHING','NOWAIT','NULL','NUMBER','NUMERIC','NVARCHAR2','OBJECT','OBJNO','OCCURENCES','OF','OFF','OFFLINE','OID','OIDINDEX','OLD','ON','ONLINE','ONLY','OPEN','OPTIMAL','OPTIMIZER_GOAL','OPTION','OR','ORDER','OUTER','OUTLINE','OVERFLOW','OWN','PACKAGE','PARALLEL','PARTITION','PASSWORD','PASSWORD_GRACE_TIME','PASSWORD_LIFE_TIME','PASSWORD_LOCK_TIME','PASSWORD_REUSE_MAX','PASSWORD_REUSE_TIME','PASSWORD_VERIFY_FUNCTION','PCTFREE','PCTINCREASE','PCTTHRESHOLD','PCTUSED','PERCENT','PERMANENT','PLAN','PLSQL_DEBUG','POST_TRANSACTION','PRECEDING','PRECISION','PRESERVE','PRIMARY','PRIOR','PRIVATE','PRIVATE_SGA','PRIVILEGE','PRIVILEGES','PROCEDURE','PROFILE','PUBLIC','PURGE','QUEUE','QUOTA','RANGE','RAW','READ','READONLY','READ_PER_CALL','READ_PER_SESSION','REAL','REBUILD','RECOVER','RECOVERABLE','RECOVERY','REF','REFERENCES','REFERENCING','REFRESH','REGISTER','REJECT','RELATIONAL','RELY','RENAME','REPLACE','RESET','RESETLOGS','RESOURCE','RESTRICT','RESTRICTED','RETURN','RETURNING','REUSE','REVERSE','REVOKE','ROLE','ROLES','ROLLBACK','ROW','ROWID','ROWNUM','ROWS','RULE','SAMPLE','SAVEPOINT','SCHEMA','SCN','SCOPE','SECTION','SEGMENT','SELECT','SEQUENCE','SERIALIZABLE','SESSION','SESSION_CACHED_CURSORS','SESSIONS_PER_USER','SET','SHARE','SHARED','SHRINK','SIZE','SKIP','SMALLINT','SNAPSHOT','SOME','SORT','SPECIFICATION','SPLIT','SQL_TRACE','STANDBY','START','STATEMENT_ID','STATISTICS','STOP','STORAGE','STORE','STRUCTURE','SUBPARTITION','SUBSTITUTABLE','SUCCESSFUL','SUM','SWITCH','SYS','SYNONYM','SYSDATE','SYSDBA','SYSOPER','SYSTEM','TABLE','TABLESPACE','TABLESPACE_NO','TABNO','TEMPORARY','THAN','THE','THEN','THREAD','TIMESTAMP','TIME','TO','TOPLEVEL','TRACE','TRACING','TRANSACTION','TRANSACTIONAL','TRANSITIONAL','TRIGGER','TRIGGERS','TRUE','TRUNCATE','TYPE','UB2','UID','UNARCHIVED','UNDO','UNION','UNIQUE','UNLIMITED','UNLOCK','UNRECOVERABLE','UNTIL','UNUSABLE','UNUSED','UPDATE','USAGE','USE','USER','USING','VALIDATE','VALIDATION','VALUE','VALUES','VARCHAR','VARCHAR2','VARYING','VIEW','WHEN','WHENEVER','WHERE','WHILE','WITH','WORK','WRITE','XML','ZONE'],
  mysql: ['ACCESSIBLE','ADD','ALL','ALTER','ANALYZE','AND','AS','ASC','ASENSITIVE','BEFORE','BETWEEN','BIGINT','BINARY','BLOB','BOTH','BY','CALL','CASCADE','CASE','CHANGE','CHAR','CHARACTER','CHECK','COLLATE','COLUMN','CONDITION','CONSTRAINT','CONTINUE','CONVERT','CREATE','CROSS','CUBE','CUME_DIST','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP','CURRENT_USER','CURSOR','DATABASE','DATABASES','DAY_HOUR','DAY_MICROSECOND','DAY_MINUTE','DAY_SECOND','DEC','DECIMAL','DECLARE','DEFAULT','DELAYED','DELETE','DENSE_RANK','DESC','DESCRIBE','DETERMINISTIC','DISTINCT','DISTINCTROW','DIV','DOUBLE','DROP','DUAL','EACH','ELSE','ELSEIF','ENCLOSED','ESCAPED','EXISTS','EXIT','EXPLAIN','FALSE','FETCH','FLOAT','FLOAT4','FLOAT8','FOR','FORCE','FOREIGN','FROM','FULLTEXT','FUNCTION','GENERATED','GET','GRANT','GROUP','GROUPING','GROUPS','HAVING','HIGH_PRIORITY','HOUR_MICROSECOND','HOUR_MINUTE','HOUR_SECOND','IF','IGNORE','IN','INDEX','INFILE','INNER','INOUT','INSENSITIVE','INSERT','INT','INT1','INT2','INT3','INT4','INT8','INTEGER','INTERVAL','INTO','IO_AFTER_GTIDS','IO_BEFORE_GTIDS','IS','ITERATE','JOIN','JSON','KEY','KEYS','KILL','LAG','LAST_INSERT_ID','LATERAL','LEAD','LEADING','LEAVE','LEFT','LIKE','LIMIT','LINEAR','LINES','LOAD','LOCALTIME','LOCALTIMESTAMP','LOCK','LONG','LONGBLOB','LONGTEXT','LOOP','LOW_PRIORITY','MASTER_BIND','MASTER_SSL_VERIFY_SERVER_CERT','MATCH','MAXVALUE','MEDIUMBLOB','MEDIUMINT','MEDIUMTEXT','MIDDLEINT','MINUTE_MICROSECOND','MINUTE_SECOND','MOD','MODIFIES','NATURAL','NOT','NO_WRITE_TO_BINLOG','NTH_VALUE','NTILE','NULL','NUMERIC','ON','OPTIMIZE','OPTIMIZER_COSTS','OPTION','OPTIONALLY','OR','ORDER','OUT','OUTER','OUTFILE','OVER','PARTITION','PERCENT_RANK','PRECISION','PRIMARY','PROCEDURE','PURGE','RANGE','RANK','READ','READ_WRITE','READS','REAL','RECURSIVE','REFERENCES','REGEXP','RELEASE','RENAME','REPEAT','REPLACE','REQUIRE','RESIGNAL','RESTRICT','RETURN','REVOKE','RIGHT','RLIKE','ROW','ROWS','ROW_COUNT','SCHEMA','SCHEMAS','SECOND_MICROSECOND','SELECT','SENSITIVE','SEPARATOR','SET','SHOW','SIGNAL','SMALLINT','SPATIAL','SPECIFIC','SQL','SQLEXCEPTION','SQLSTATE','SQLWARNING','SQL_BIG_RESULT','SQL_CALC_FOUND_ROWS','SQL_SMALL_RESULT','SSL','STARTING','STORED','STRAIGHT_JOIN','SYSTEM','TABLE','TERMINATED','THEN','TINYBLOB','TINYINT','TINYTEXT','TO','TRAILING','TRIGGER','TRUE','UNDO','UNION','UNIQUE','UNLOCK','UNSIGNED','UPDATE','USAGE','USE','USING','UTC_DATE','UTC_TIME','UTC_TIMESTAMP','VALUES','VARBINARY','VARCHAR','VARCHARACTER','VARYING','VIRTUAL','WHEN','WHERE','WHILE','WINDOW','WITH','WRITE','XOR','YEAR_MONTH','ZEROFILL'],
  postgresql: ['ALL','ANALYSE','ANALYZE','AND','ANY','ARRAY','AS','ASC','ASYMMETRIC','AUTHORIZATION','BETWEEN','BINARY','BIT','BOTH','CASE','CAST','CHECK','COLLATE','COLLATION','COLUMN','CONCURRENTLY','CONSTRAINT','CREATE','CROSS','CURRENT_CATALOG','CURRENT_DATE','CURRENT_ROLE','CURRENT_SCHEMA','CURRENT_TIME','CURRENT_TIMESTAMP','CURRENT_USER','DEFAULT','DEFERRABLE','DESC','DISTINCT','DO','DOMAIN','DOUBLE','DROP','EACH','ELSE','END','EXCEPT','EXCLUDE','EXCLUDING','EXECUTE','EXISTS','EXPLAIN','FALSE','FETCH','FILTER','FOLLOWING','FOR','FOREIGN','FREEZE','FROM','FULL','FUNCTION','GRANT','GROUP','HAVING','ILIKE','IN','INITIALLY','INNER','INOUT','INSERT','INSTEAD','INTERSECT','INTO','IS','ISNULL','JOIN','LATERAL','LEADING','LEFT','LIKE','LIMIT','LOCALTIME','LOCALTIMESTAMP','NATURAL','NOT','NOTNULL','NULL','OFFSET','ON','ONLY','OR','ORDER','OUTER','OVER','OVERLAPS','PLACING','PRIMARY','REFERENCES','RETURNING','RIGHT','ROLLBACK','ROW','ROWS','SELECT','SESSION_USER','SET','SOME','SYMMETRIC','TABLE','TABLESAMPLE','THEN','TO','TRAILING','TRUE','UNION','UNIQUE','USER','USING','VARIADIC','VERBOSE','VIEW','WHEN','WHERE','WINDOW','WITH'],
  sqlserver: ['ADD','ALL','ALTER','AND','ANY','AS','ASC','AUTHORIZATION','BACKUP','BEGIN','BETWEEN','BREAK','BROWSE','BULK','BY','CASCADE','CASE','CHECK','CHECKPOINT','CLOSE','CLUSTERED','COALESCE','COLLATE','COLUMN','COMMIT','COMPUTE','CONSTRAINT','CONTAINS','CONTAINSTABLE','CONTINUE','CONVERT','CREATE','CROSS','CURRENT','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP','CURRENT_USER','CURSOR','DATABASE','DBCC','DEALLOCATE','DECLARE','DEFAULT','DELETE','DENY','DESC','DISK','DISTINCT','DISTRIBUTED','DOUBLE','DROP','DUMP','ELSE','END','ERRLVL','ESCAPE','EXCEPT','EXEC','EXECUTE','EXISTS','EXIT','EXTERNAL','FETCH','FILE','FILLFACTOR','FOR','FOREIGN','FREETEXT','FREETEXTTABLE','FROM','FULL','FUNCTION','GOTO','GRANT','GROUP','HAVING','HOLDLOCK','IDENTITY','IDENTITYCOL','IDENTITY_INSERT','IF','IN','INDEX','INNER','INSERT','INTERSECT','INTO','IS','JOIN','KEY','KILL','LEFT','LIKE','LINENO','LOAD','MERGE','NATIONAL','NOCHECK','NONCLUSTERED','NOT','NULL','NULLIF','OF','OFF','OFFSETS','ON','OPEN','OPENDATASOURCE','OPENQUERY','OPENROWSET','OPENXML','OPTION','OR','ORDER','OUTER','OVER','PERCENT','PIVOT','PLAN','PRECISION','PRIMARY','PRINT','PROC','PROCEDURE','PUBLIC','RAISERROR','READ','READTEXT','RECONFIGURE','REFERENCES','REPLICATION','RESTORE','RESTRICT','RETURN','REVERT','REVOKE','RIGHT','ROLLBACK','ROWCOUNT','ROWGUIDCOL','RULE','SAVE','SCHEMA','SELECT','SESSION_USER','SET','SETUSER','SHUTDOWN','SOME','STATISTICS','SYSTEM_USER','TABLE','TABLESAMPLE','TEXTSIZE','THEN','TO','TOP','TRAN','TRANSACTION','TRIGGER','TRUNCATE','TSEQUAL','UNION','UNIQUE','UNPIVOT','UPDATE','UPDATETEXT','USE','USER','VALUES','VARYING','VIEW','WAITFOR','WHEN','WHERE','WHILE','WITH','WRITETEXT'],
};

// 各方言非法字符规则
const NAME_RULES = {
  oracle:    { pattern: /^[A-Za-z_][A-Za-z0-9_$#]*$/, msg: '只允许字母、数字、_、$、#，且不能以数字开头' },
  mysql:     { pattern: /^[A-Za-z_][A-Za-z0-9_]*$/, msg: '只允许字母、数字、_，且不能以数字开头' },
  postgresql:{ pattern: /^[A-Za-z_][A-Za-z0-9_]*$/, msg: '只允许字母、数字、_，且不能以数字开头' },
  sqlserver: { pattern: /^[A-Za-z_][A-Za-z0-9_@#$]*$/, msg: '只允许字母、数字、_、@、#、$，且不能以数字开头' },
};

// 各方言数据类型正则
const TYPE_PATTERNS = {
  oracle: /^(VARCHAR2|NVARCHAR2|NUMBER|DATE|TIMESTAMP|CLOB|BLOB|CHAR|NCHAR|RAW|LONG|FLOAT|INTEGER|INT|SMALLINT|DECIMAL|REAL|DOUBLE|BOOLEAN|NCLOB|BFILE|UROWID|MLSLABEL)\s*(\([0-9,\s]+\))?$/i,
  mysql: /^(TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|DATE|DATETIME|TIMESTAMP|TIME|YEAR|CHAR|VARCHAR|BINARY|VARBINARY|TINYBLOB|BLOB|MEDIUMBLOB|LONGBLOB|TINYTEXT|TEXT|MEDIUMTEXT|LONGTEXT|ENUM|SET|JSON|BOOLEAN|BIT|SERIAL)\s*(\([0-9,\s]+\))?$/i,
  postgresql: /^(SMALLINT|INTEGER|BIGINT|SERIAL|BIGSERIAL|SMALLSERIAL|REAL|DOUBLE|PRECISION|NUMERIC|DECIMAL|MONEY|CHAR|VARCHAR|TEXT|BYTEA|DATE|TIMESTAMP|TIMESTAMPTZ|TIME|TIMETZ|INTERVAL|BOOLEAN|BIT|UUID|JSON|JSONB|XML|CIDR|INET|MACADDR|POINT|LINE|LSEG|BOX|PATH|POLYGON|CIRCLE|ARRAY)\s*(\([0-9,\s]+\))?(\[\])?$/i,
  sqlserver: /^(TINYINT|SMALLINT|INT|INTEGER|BIGINT|BIT|DECIMAL|NUMERIC|MONEY|SMALLMONEY|FLOAT|REAL|DATE|DATETIME|DATETIME2|DATETIMEOFFSET|SMALLDATETIME|TIME|CHAR|VARCHAR|NCHAR|NVARCHAR|TEXT|NTEXT|BINARY|VARBINARY|IMAGE|UNIQUEIDENTIFIER|SQL_VARIANT|TABLE|XML|ROWVERSION|TIMESTAMP|HIERARCHYID|GEOMETRY|GEOGRAPHY)\s*(\([0-9,\s]+\))?$/i,
};

/**
 * 校验所有表的 SQL 语法，返回错误列表
 * @returns {{ errors: Array<{table: string, field: string, type: string, msg: string}>, warnings: Array } }
 */
function validateSQL() {
  const d = currentDialect;
  const reserved = (RESERVED_WORDS[d] || []).map(w => w.toUpperCase());
  const nameRule = NAME_RULES[d];
  const typePattern = TYPE_PATTERNS[d];
  const errors = [];
  const warnings = [];

  if (!tables.length) {
    warnings.push({ table: '-', field: '', type: 'warning', msg: '暂无表定义' });
    return { errors, warnings };
  }

  // 检测表名重复
  const tableNames = tables.map(t => t.name.toUpperCase());
  tableNames.forEach((name, i) => {
    if (name !== name.trim()) {
      errors.push({ table: tables[i].name, field: '', type: 'error', msg: `表名首尾包含空格` });
    }
    if (!nameRule.pattern.test(tables[i].name)) {
      errors.push({ table: tables[i].name, field: '', type: 'error', msg: `表名格式不合法：${nameRule.msg}` });
    }
    if (reserved.includes(name)) {
      warnings.push({ table: tables[i].name, field: '', type: 'warning', msg: `表名 "${name}" 是保留字，建议加引号或改名` });
    }
    if (name.length > 128) {
      warnings.push({ table: tables[i].name, field: '', type: 'warning', msg: `表名超过 128 个字符` });
    }
  });

  const dupTableNames = tableNames.filter((n, i) => tableNames.indexOf(n) !== i);
  if (dupTableNames.length) {
    errors.push({ table: dupTableNames[0], field: '', type: 'error', msg: `存在重复表名: ${[...new Set(dupTableNames)].join(', ')}` });
  }

  tables.forEach(t => {
    if (!t.fields.length) {
      warnings.push({ table: t.name, field: '', type: 'warning', msg: `表 "${t.name}" 没有字段定义` });
      return;
    }

    // 检测多个主键
    const pkFields = t.fields.filter(f => f.pk);
    if (pkFields.length > 1) {
      errors.push({ table: t.name, field: pkFields.map(f => f.name).join(', '), type: 'error', msg: '不支持复合主键，每张表只能有 1 个主键字段' });
    }

    // 检测字段名重复
    const fieldNames = t.fields.map(f => f.name.toUpperCase());
    const dupFields = fieldNames.filter((n, i) => fieldNames.indexOf(n) !== i);
    if (dupFields.length) {
      errors.push({ table: t.name, field: [...new Set(dupFields)].join(', '), type: 'error', msg: `存在重复字段名: ${[...new Set(dupFields)].join(', ')}` });
    }

    t.fields.forEach(f => {
      // 字段名检查
      if (!f.name || !f.name.trim()) {
        errors.push({ table: t.name, field: f.name || '(空)', type: 'error', msg: '字段名不能为空' });
        return;
      }
      if (f.name !== f.name.trim()) {
        errors.push({ table: t.name, field: f.name, type: 'error', msg: '字段名首尾包含空格' });
      }
      if (!nameRule.pattern.test(f.name)) {
        errors.push({ table: t.name, field: f.name, type: 'error', msg: `字段名格式不合法：${nameRule.msg}` });
      }
      if (reserved.includes(f.name.toUpperCase())) {
        warnings.push({ table: t.name, field: f.name, type: 'warning', msg: `字段名 "${f.name}" 是保留字，建议加引号或改名` });
      }

      // 类型检查
      if (!f.type || !f.type.trim()) {
        errors.push({ table: t.name, field: f.name, type: 'error', msg: '字段类型不能为空' });
      } else if (!typePattern.test(f.type.trim())) {
        warnings.push({ table: t.name, field: f.name, type: 'warning', msg: `类型 "${f.type}" 不是标准 ${getDialect().label} 类型，请确认` });
      }

      // 主键不能为空
      if (f.pk && f.nullable) {
        warnings.push({ table: t.name, field: f.name, type: 'warning', msg: '主键字段建议设为 NOT NULL' });
      }

      // AUTO_INCREMENT 只限 MySQL
      if (f.autoInc && d !== 'mysql') {
        errors.push({ table: t.name, field: f.name, type: 'error', msg: `AUTO_INCREMENT 仅适用于 MySQL，当前方言为 ${getDialect().label}` });
      }
      // IDENTITY 只限 SQL Server
      if (f.identity && d !== 'sqlserver') {
        errors.push({ table: t.name, field: f.name, type: 'error', msg: `IDENTITY 仅适用于 SQL Server，当前方言为 ${getDialect().label}` });
      }

      // 注释中的单引号检查
      if (f.comment && f.comment.includes("'")) {
        warnings.push({ table: t.name, field: f.name, type: 'warning', msg: `注释中包含单引号，可能导致 SQL 语法错误` });
      }
    });
    // 表注释单引号检查（放在字段循环外，避免重复）
    if (t.comment && t.comment.includes("'")) {
      warnings.push({ table: t.name, field: '', type: 'warning', msg: `表注释包含单引号，可能导致 SQL 语法错误` });
    }
  });

  return { errors, warnings };
}

function runValidation() {
  const { errors, warnings } = validateSQL();
  const el = document.getElementById('validationPanel');
  el.style.display = 'block';
  const total = errors.length + warnings.length;

  if (total === 0) {
    el.className = 'validation-panel';
    el.innerHTML = `<div class="val-header val-pass"><span class="val-icon">✅</span> 校验通过 · 无错误和警告</div>`;
  } else {
    let html = `<div class="val-header val-fail"><span class="val-icon">⚠️</span> 发现 <strong>${errors.length}</strong> 个错误，<strong>${warnings.length}</strong> 个警告</div>`;
    html += '<div class="val-list">';
    errors.forEach(e => {
      html += `<div class="val-item val-error">
        <span class="val-badge error">错误</span>
        <span class="val-table">${escHtml(e.table)}</span>
        ${e.field ? `<span class="val-field">${escHtml(e.field)}</span>` : ''}
        <span class="val-msg">${escHtml(e.msg)}</span>
      </div>`;
    });
    warnings.forEach(w => {
      html += `<div class="val-item val-warning">
        <span class="val-badge warning">警告</span>
        <span class="val-table">${escHtml(w.table)}</span>
        ${w.field ? `<span class="val-field">${escHtml(w.field)}</span>` : ''}
        <span class="val-msg">${escHtml(w.msg)}</span>
      </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
    el.className = 'validation-panel val-show';
  }
}

function hideValidation() {
  const el = document.getElementById('validationPanel');
  el.style.display = 'none';
  el.innerHTML = '';
}

// ══════════════════════════════════════════
// SQL 高亮（方言感知）
// ══════════════════════════════════════════
function highlight(sql) {
  const d = getDialect();
  const keywords = d.highlightKeywords;
  const types = d.highlightTypes;
  let out = '', i = 0;
  while (i < sql.length) {
    if (sql[i] === '-' && sql[i+1] === '-') {
      let end = sql.indexOf('\n', i); if (end === -1) end = sql.length;
      out += `<span class="cmt">${esc(sql.slice(i, end))}</span>`; i = end; continue;
    }
    if (sql[i] === "'") {
      let j = i + 1; while (j < sql.length && sql[j] !== "'") j++; j++;
      out += `<span class="str">${esc(sql.slice(i, j))}</span>`; i = j; continue;
    }
    // SQL Server N'...' string
    if (sql[i] === 'N' && sql[i+1] === "'") {
      let j = i + 2; while (j < sql.length && sql[j] !== "'") j++; j++;
      out += `<span class="str">${esc(sql.slice(i, j))}</span>`; i = j; continue;
    }
    if (/[A-Za-z_]/.test(sql[i])) {
      let j = i; while (j < sql.length && /[\w]/.test(sql[j])) j++;
      const w = sql.slice(i, j), wu = w.toUpperCase();
      if (keywords.includes(wu)) out += `<span class="kw">${esc(w)}</span>`;
      else if (types.some(t => wu.startsWith(t))) out += `<span class="fn">${esc(w)}</span>`;
      else out += `<span class="col">${esc(w)}</span>`;
      i = j; continue;
    }
    out += esc(sql[i]); i++;
  }
  return out;
}
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
