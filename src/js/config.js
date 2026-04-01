// FluxSQL - 方言配置模块

const DIALECTS = {
  oracle: {
    label: 'Oracle',
    // 注释语法
    comment: {
      tableAfter: (t) => `\nCOMMENT ON TABLE ${t.name} IS '${t.comment}';`,
      columnAfter: (t, f) => `COMMENT ON COLUMN ${t.name}.${f.name} IS '${f.comment}';`,
      inline: (f) => `   -- ${f.comment}`,
      quoteChar: "'",
    },
    // 字段默认类型
    defaultIdType: 'VARCHAR2(36)',
    defaultFieldType: 'VARCHAR2(100)',
    // 类型建议列表
    typeList: [
      'VARCHAR2(36)','VARCHAR2(50)','VARCHAR2(100)','VARCHAR2(200)','VARCHAR2(500)','VARCHAR2(1000)',
      'NUMBER(12)','NUMBER(18)','NUMBER(18,6)','CHAR(1)','CHAR(8)',
      'DATE','TIMESTAMP','CLOB','BLOB','INTEGER','BIGINT'
    ],
    // 高亮类型关键词
    highlightTypes: ['VARCHAR2','VARCHAR','NUMBER','CHAR','DATE','TIMESTAMP','CLOB','BLOB','INTEGER','INT','BIGINT','DECIMAL','FLOAT','DOUBLE','BOOLEAN','TEXT','NVARCHAR','RAW','LONG','NCLOB'],
    // 高亮额外关键词
    highlightKeywords: ['CREATE','TABLE','NOT','NULL','PRIMARY','KEY','DEFAULT','COMMENT','ON','COLUMN','IS','DROP','IF','EXISTS','CONSTRAINT','INDEX','UNIQUE','AUTO_INCREMENT','SERIAL','IDENTITY','BIT','TINYINT','SMALLINT','MEDIUMINT','DECIMAL','NUMERIC','REAL','DATETIME','TIME','YEAR','ENUM','SET','JSON','XML','NTEXT','MONEY','SMALLMONEY','UNIQUEIDENTIFIER','IMAGE','NVARCHAR','NCHAR','VARCHAR_MAX'],
    // 系统字段模板
    systemFields: [
      { name:'DATA_FROM',type:'VARCHAR2(80)',nullable:true,pk:false,defaultVal:'',comment:'数据来源' },
      { name:'OPTIMISTIC_LOCK_VERSION',type:'NUMBER(12)',nullable:true,pk:false,defaultVal:'',comment:'乐观锁版本' },
      { name:'PROVINCE_CODE',type:'VARCHAR2(8)',nullable:true,pk:false,defaultVal:'',comment:'省编码' },
      { name:'BUREAU_CODE',type:'VARCHAR2(8)',nullable:true,pk:false,defaultVal:'',comment:'局编码' },
      { name:'CREATOR_ID',type:'VARCHAR2(32)',nullable:true,pk:false,defaultVal:'',comment:'创建人ID' },
      { name:'CREATOR_NAME',type:'VARCHAR2(50)',nullable:true,pk:false,defaultVal:'',comment:'创建人' },
      { name:'UPDATER_ID',type:'VARCHAR2(32)',nullable:true,pk:false,defaultVal:'',comment:'修改人ID' },
      { name:'UPDATER_NAME',type:'VARCHAR2(50)',nullable:true,pk:false,defaultVal:'',comment:'修改人' },
      { name:'CREATE_TIME',type:'TIMESTAMP',nullable:true,pk:false,defaultVal:'',comment:'创建时间' },
      { name:'UPDATE_TIME',type:'TIMESTAMP',nullable:true,pk:false,defaultVal:'',comment:'更新时间' },
      { name:'DELETE_FLAG',type:'VARCHAR2(8)',nullable:true,pk:false,defaultVal:'',comment:'删除标识:1正常;2已删除' },
    ],
    // AI 快捷指令
    aiChips: [
      '帮我添加创建时间和更新时间字段',
      '把所有 VARCHAR2(200) 改成 VARCHAR2(500)',
      '添加备注字段 REMARK',
      '删除所有系统字段',
      '规范所有字段注释',
      '添加软删除字段 DELETE_FLAG',
    ],
    // AI 系统提示
    aiSystemPrompt: `你是一个 Oracle 数据库建表专家。用户会给你一张表的当前结构（JSON），以及修改要求。
你需要根据要求直接返回修改后的完整表结构 JSON，不要有任何解释，只输出 JSON。

字段对象格式：
{
  "id": "保留原 id，新字段用新的随机字符串",
  "name": "字段名（大写下划线命名）",
  "type": "Oracle 类型，如 VARCHAR2(100)、NUMBER(12)、TIMESTAMP",
  "nullable": true/false,
  "pk": true/false,
  "defaultVal": "默认值字符串，无则为空字符串",
  "comment": "注释"
}

表对象格式：
{
  "name": "表名（大写下划线命名）",
  "comment": "表注释",
  "fields": [...]
}

规则：
- 字段名使用大写加下划线
- 主键设 pk:true, nullable:false
- VARCHAR2 长度根据业务判断：姓名50，ID类36，编码50，描述200-500，备注1000
- 时间字段用 TIMESTAMP
- ⚠️【关键】必须原封不动保留原始结构中的所有字段！返回的 fields 数组必须包含原始 JSON 中的每一个字段。
  仅当用户明确要求删除某个字段时，才允许移除该字段。如果用户没有提到删除，则所有原始字段必须出现在返回结果中。
- ⚠️ 返回前请自检：对比原始字段数量与返回字段数量。如果字段数量变少了但用户没有要求删除，说明你遗漏了字段，请补回。
- 只输出 JSON，不要 \`\`\`json 包裹，不要任何其他文字`,
  },

  mysql: {
    label: 'MySQL',
    comment: {
      tableAfter: null,  // MySQL 表注释用建表后的 COMMENT
      columnAfter: null, // MySQL 列注释用行内 COMMENT
      inline: null,      // 不使用行内 -- 注释
      tableInCreate: true, // 建表语句末尾 COMMENT
      columnInCreate: true, // 列定义末尾 COMMENT
      quoteChar: "'",
    },
    defaultIdType: 'VARCHAR(36)',
    defaultFieldType: 'VARCHAR(100)',
    typeList: [
      'VARCHAR(36)','VARCHAR(50)','VARCHAR(100)','VARCHAR(200)','VARCHAR(500)','VARCHAR(1000)',
      'INT(11)','BIGINT(20)','INT(10) UNSIGNED','TINYINT(1)',
      'CHAR(1)','CHAR(8)',
      'DATE','DATETIME','TIMESTAMP','TIME',
      'DECIMAL(18,6)','FLOAT','DOUBLE',
      'TEXT','MEDIUMTEXT','LONGTEXT',
      'JSON','ENUM','BLOB','BOOLEAN'
    ],
    highlightTypes: ['VARCHAR','INT','BIGINT','TINYINT','SMALLINT','MEDIUMINT','CHAR','DATE','DATETIME','TIMESTAMP','TIME','DECIMAL','FLOAT','DOUBLE','TEXT','MEDIUMTEXT','LONGTEXT','JSON','ENUM','BLOB','BOOLEAN','YEAR'],
    highlightKeywords: ['CREATE','TABLE','NOT','NULL','PRIMARY','KEY','DEFAULT','COMMENT','ON','COLUMN','IS','DROP','IF','EXISTS','CONSTRAINT','INDEX','UNIQUE','AUTO_INCREMENT','SERIAL','IDENTITY','ENGINE','CHARSET','COLLATE','UNSIGNED','ZEROFILL','CURRENT_TIMESTAMP'],
    systemFields: [
      { name:'data_from',type:'VARCHAR(80)',nullable:true,pk:false,defaultVal:'',comment:'数据来源' },
      { name:'optimistic_lock_version',type:'INT(11)',nullable:true,pk:false,defaultVal:'0',comment:'乐观锁版本' },
      { name:'province_code',type:'VARCHAR(8)',nullable:true,pk:false,defaultVal:'',comment:'省编码' },
      { name:'bureau_code',type:'VARCHAR(8)',nullable:true,pk:false,defaultVal:'',comment:'局编码' },
      { name:'creator_id',type:'VARCHAR(32)',nullable:true,pk:false,defaultVal:'',comment:'创建人ID' },
      { name:'creator_name',type:'VARCHAR(50)',nullable:true,pk:false,defaultVal:'',comment:'创建人' },
      { name:'updater_id',type:'VARCHAR(32)',nullable:true,pk:false,defaultVal:'',comment:'修改人ID' },
      { name:'updater_name',type:'VARCHAR(50)',nullable:true,pk:false,defaultVal:'',comment:'修改人' },
      { name:'create_time',type:'DATETIME',nullable:true,pk:false,defaultVal:'CURRENT_TIMESTAMP',comment:'创建时间' },
      { name:'update_time',type:'DATETIME',nullable:true,pk:false,defaultVal:'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',comment:'更新时间' },
      { name:'delete_flag',type:'TINYINT(1)',nullable:true,pk:false,defaultVal:'1',comment:'删除标识:1正常;2已删除' },
    ],
    aiChips: [
      '帮我添加创建时间和更新时间字段',
      '把所有 VARCHAR(200) 改成 VARCHAR(500)',
      '添加备注字段 remark',
      '删除所有系统字段',
      '规范所有字段注释',
      '添加软删除字段 delete_flag',
      '把所有 INT 改成 BIGINT',
    ],
    aiSystemPrompt: `你是一个 MySQL 数据库建表专家。用户会给你一张表的当前结构（JSON），以及修改要求。
你需要根据要求直接返回修改后的完整表结构 JSON，不要有任何解释，只输出 JSON。

字段对象格式：
{
  "id": "保留原 id，新字段用新的随机字符串",
  "name": "字段名（小写下划线命名）",
  "type": "MySQL 类型，如 VARCHAR(100)、INT(11)、BIGINT(20)、DATETIME、TEXT",
  "nullable": true/false,
  "pk": true/false,
  "defaultVal": "默认值字符串，无则为空字符串",
  "comment": "注释"
}

表对象格式：
{
  "name": "表名（小写下划线命名）",
  "comment": "表注释",
  "fields": [...]
}

规则：
- 字段名使用小写加下划线
- 主键设 pk:true, nullable:false
- 字符串长度根据业务判断：姓名50，ID类36，编码50，描述200-500，备注500
- 时间字段用 DATETIME
- ⚠️【关键】必须原封不动保留原始结构中的所有字段！返回的 fields 数组必须包含原始 JSON 中的每一个字段。
  仅当用户明确要求删除某个字段时，才允许移除该字段。如果用户没有提到删除，则所有原始字段必须出现在返回结果中。
- ⚠️ 返回前请自检：对比原始字段数量与返回字段数量。如果字段数量变少了但用户没有要求删除，说明你遗漏了字段，请补回。
- 只输出 JSON，不要 \`\`\`json 包裹，不要任何其他文字`,
  },

  postgresql: {
    label: 'PostgreSQL',
    comment: {
      tableAfter: (t) => `\nCOMMENT ON TABLE ${t.name} IS '${t.comment}';`,
      columnAfter: (t, f) => `COMMENT ON COLUMN ${t.name}.${f.name} IS '${f.comment}';`,
      inline: (f) => `   -- ${f.comment}`,
      quoteChar: "'",
    },
    defaultIdType: 'VARCHAR(36)',
    defaultFieldType: 'VARCHAR(100)',
    typeList: [
      'VARCHAR(36)','VARCHAR(50)','VARCHAR(100)','VARCHAR(200)','VARCHAR(500)','VARCHAR(1000)',
      'INTEGER','BIGINT','SMALLINT','SERIAL','BIGSERIAL',
      'CHAR(1)','CHAR(8)',
      'DATE','TIMESTAMP','TIMESTAMPTZ','TIME','TIMETZ',
      'NUMERIC(18,6)','REAL','DOUBLE PRECISION',
      'TEXT','BYTEA','BOOLEAN','JSON','JSONB','UUID','XML','CIDR','INET'
    ],
    highlightTypes: ['VARCHAR','INTEGER','BIGINT','SMALLINT','SERIAL','BIGSERIAL','CHAR','DATE','TIMESTAMP','TIMESTAMPTZ','TIME','TIMETZ','NUMERIC','REAL','DOUBLE','PRECISION','TEXT','BYTEA','BOOLEAN','JSON','JSONB','UUID','XML','CIDR','INET','BIT','MONEY','INTERVAL'],
    highlightKeywords: ['CREATE','TABLE','NOT','NULL','PRIMARY','KEY','DEFAULT','COMMENT','ON','COLUMN','IS','DROP','IF','EXISTS','CONSTRAINT','INDEX','UNIQUE','AUTO_INCREMENT','SERIAL','IDENTITY','REFERENCES','FOREIGN','CASCADE','CHECK','GENERATED','ALWAYS','AS','STORED','TEMPORARY','UNLOGGED','PARTITION'],
    systemFields: [
      { name:'data_from',type:'VARCHAR(80)',nullable:true,pk:false,defaultVal:'',comment:'数据来源' },
      { name:'optimistic_lock_version',type:'INTEGER',nullable:true,pk:false,defaultVal:'0',comment:'乐观锁版本' },
      { name:'province_code',type:'VARCHAR(8)',nullable:true,pk:false,defaultVal:'',comment:'省编码' },
      { name:'bureau_code',type:'VARCHAR(8)',nullable:true,pk:false,defaultVal:'',comment:'局编码' },
      { name:'creator_id',type:'VARCHAR(32)',nullable:true,pk:false,defaultVal:'',comment:'创建人ID' },
      { name:'creator_name',type:'VARCHAR(50)',nullable:true,pk:false,defaultVal:'',comment:'创建人' },
      { name:'updater_id',type:'VARCHAR(32)',nullable:true,pk:false,defaultVal:'',comment:'修改人ID' },
      { name:'updater_name',type:'VARCHAR(50)',nullable:true,pk:false,defaultVal:'',comment:'修改人' },
      { name:'create_time',type:'TIMESTAMPTZ',nullable:true,pk:false,defaultVal:'CURRENT_TIMESTAMP',comment:'创建时间' },
      { name:'update_time',type:'TIMESTAMPTZ',nullable:true,pk:false,defaultVal:'CURRENT_TIMESTAMP',comment:'更新时间' },
      { name:'delete_flag',type:'VARCHAR(8)',nullable:true,pk:false,defaultVal:'1',comment:'删除标识:1正常;2已删除' },
    ],
    aiChips: [
      '帮我添加创建时间和更新时间字段',
      '把所有 VARCHAR(200) 改成 VARCHAR(500)',
      '添加备注字段 remark',
      '删除所有系统字段',
      '规范所有字段注释',
      '添加软删除字段 delete_flag',
      '给主键添加 UUID 默认值',
    ],
    aiSystemPrompt: `你是一个 PostgreSQL 数据库建表专家。用户会给你一张表的当前结构（JSON），以及修改要求。
你需要根据要求直接返回修改后的完整表结构 JSON，不要有任何解释，只输出 JSON。

字段对象格式：
{
  "id": "保留原 id，新字段用新的随机字符串",
  "name": "字段名（小写下划线命名）",
  "type": "PostgreSQL 类型，如 VARCHAR(100)、INTEGER、BIGINT、TIMESTAMPTZ、TEXT、JSONB、UUID",
  "nullable": true/false,
  "pk": true/false,
  "defaultVal": "默认值字符串，无则为空字符串",
  "comment": "注释"
}

表对象格式：
{
  "name": "表名（小写下划线命名）",
  "comment": "表注释",
  "fields": [...]
}

规则：
- 字段名使用小写加下划线
- 主键设 pk:true, nullable:false
- 字符串长度根据业务判断：姓名50，ID类36，编码50，描述200-500，备注500
- 时间字段优先用 TIMESTAMPTZ
- ⚠️【关键】必须原封不动保留原始结构中的所有字段！返回的 fields 数组必须包含原始 JSON 中的每一个字段。
  仅当用户明确要求删除某个字段时，才允许移除该字段。如果用户没有提到删除，则所有原始字段必须出现在返回结果中。
- ⚠️ 返回前请自检：对比原始字段数量与返回字段数量。如果字段数量变少了但用户没有要求删除，说明你遗漏了字段，请补回。
- 只输出 JSON，不要 \`\`\`json 包裹，不要任何其他文字`,
  },

  sqlserver: {
    label: 'SQL Server',
    comment: {
      tableAfter: (t) => `\nEXEC sp_addextendedproperty 'MS_Description', N'${t.comment}', 'SCHEMA', 'dbo', 'TABLE', '${t.name}';`,
      columnAfter: (t, f) => `EXEC sp_addextendedproperty 'MS_Description', N'${f.comment}', 'SCHEMA', 'dbo', 'TABLE', '${t.name}', 'COLUMN', '${f.name}';`,
      inline: (f) => `   -- ${f.comment}`,
      quoteChar: "'",
    },
    defaultIdType: 'UNIQUEIDENTIFIER',
    defaultFieldType: 'NVARCHAR(100)',
    typeList: [
      'NVARCHAR(36)','NVARCHAR(50)','NVARCHAR(100)','NVARCHAR(200)','NVARCHAR(500)','NVARCHAR(MAX)',
      'VARCHAR(100)','VARCHAR(200)','VARCHAR(MAX)',
      'INT','BIGINT','SMALLINT','TINYINT',
      'CHAR(1)','NCHAR(1)',
      'DATE','DATETIME','DATETIME2','DATETIMEOFFSET','TIME','SMALLDATETIME',
      'DECIMAL(18,6)','NUMERIC(18,6)','FLOAT','REAL','MONEY','SMALLMONEY',
      'BIT','TEXT','NTEXT','IMAGE','UNIQUEIDENTIFIER','XML','VARBINARY(MAX)'
    ],
    highlightTypes: ['NVARCHAR','VARCHAR','INT','BIGINT','SMALLINT','TINYINT','CHAR','NCHAR','DATE','DATETIME','DATETIME2','DATETIMEOFFSET','TIME','SMALLDATETIME','DECIMAL','NUMERIC','FLOAT','REAL','MONEY','SMALLMONEY','BIT','TEXT','NTEXT','IMAGE','UNIQUEIDENTIFIER','XML','VARBINARY','MAX'],
    highlightKeywords: ['CREATE','TABLE','NOT','NULL','PRIMARY','KEY','DEFAULT','COMMENT','ON','COLUMN','IS','DROP','IF','EXISTS','CONSTRAINT','INDEX','UNIQUE','AUTO_INCREMENT','SERIAL','IDENTITY','GO','EXEC','sp_addextendedproperty','SCHEMA','dbo','NONCLUSTERED','CLUSTERED','WITH','SET','ANSI_NULLS','QUOTED_IDENTIFIER','N','NVARCHAR','UNIQUEIDENTIFIER','NEWID','DEFAULT','INSERTED','SCOPE_IDENTITY'],
    systemFields: [
      { name:'DataFrom',type:'NVARCHAR(80)',nullable:true,pk:false,defaultVal:'',comment:'数据来源' },
      { name:'OptimisticLockVersion',type:'INT',nullable:true,pk:false,defaultVal:'0',comment:'乐观锁版本' },
      { name:'ProvinceCode',type:'NVARCHAR(8)',nullable:true,pk:false,defaultVal:'',comment:'省编码' },
      { name:'BureauCode',type:'NVARCHAR(8)',nullable:true,pk:false,defaultVal:'',comment:'局编码' },
      { name:'CreatorId',type:'NVARCHAR(32)',nullable:true,pk:false,defaultVal:'',comment:'创建人ID' },
      { name:'CreatorName',type:'NVARCHAR(50)',nullable:true,pk:false,defaultVal:'',comment:'创建人' },
      { name:'UpdaterId',type:'NVARCHAR(32)',nullable:true,pk:false,defaultVal:'',comment:'修改人ID' },
      { name:'UpdaterName',type:'NVARCHAR(50)',nullable:true,pk:false,defaultVal:'',comment:'修改人' },
      { name:'CreateTime',type:'DATETIME2',nullable:true,pk:false,defaultVal:'GETDATE()',comment:'创建时间' },
      { name:'UpdateTime',type:'DATETIME2',nullable:true,pk:false,defaultVal:'GETDATE()',comment:'更新时间' },
      { name:'DeleteFlag',type:'NVARCHAR(8)',nullable:true,pk:false,defaultVal:'1',comment:'删除标识:1正常;2已删除' },
    ],
    aiChips: [
      '帮我添加创建时间和更新时间字段',
      '把所有 NVARCHAR(200) 改成 NVARCHAR(500)',
      '添加备注字段 Remark',
      '删除所有系统字段',
      '规范所有字段注释',
      '添加软删除字段 DeleteFlag',
      '把主键类型改成 INT IDENTITY',
    ],
    aiSystemPrompt: `你是一个 SQL Server 数据库建表专家。用户会给你一张表的当前结构（JSON），以及修改要求。
你需要根据要求直接返回修改后的完整表结构 JSON，不要有任何解释，只输出 JSON。

字段对象格式：
{
  "id": "保留原 id，新字段用新的随机字符串",
  "name": "字段名（PascalCase 大驼峰命名）",
  "type": "SQL Server 类型，如 NVARCHAR(100)、INT、BIGINT、DATETIME2、BIT、UNIQUEIDENTIFIER",
  "nullable": true/false,
  "pk": true/false,
  "defaultVal": "默认值字符串，无则为空字符串",
  "comment": "注释"
}

表对象格式：
{
  "name": "表名（PascalCase 大驼峰命名）",
  "comment": "表注释",
  "fields": [...]
}

规则：
- 字段名使用 PascalCase（首字母大写驼峰）
- 主键设 pk:true, nullable:false
- 字符串长度根据业务判断：姓名50，ID类36，编码50，描述200-500，备注500
- 时间字段用 DATETIME2
- ⚠️【关键】必须原封不动保留原始结构中的所有字段！返回的 fields 数组必须包含原始 JSON 中的每一个字段。
  仅当用户明确要求删除某个字段时，才允许移除该字段。如果用户没有提到删除，则所有原始字段必须出现在返回结果中。
- ⚠️ 返回前请自检：对比原始字段数量与返回字段数量。如果字段数量变少了但用户没有要求删除，说明你遗漏了字段，请补回。
- 只输出 JSON，不要 \`\`\`json 包裹，不要任何其他文字`,
  },
};
