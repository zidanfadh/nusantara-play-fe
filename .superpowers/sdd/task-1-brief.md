## Task 1: Harden Backend PROT Detail Access

**Files:**

- Modify: `../nusantara-play-backend/src/modules/prot/prot.controller.ts`
- Modify: `../nusantara-play-backend/src/modules/prot/prot.service.ts`
- Test: `../nusantara-play-backend/src/modules/prot/prot.service.spec.ts`

**Interfaces:**

- Consumes: Existing `PROTService.findAll(query, user?)` role visibility behavior.
- Produces: `PROTService.findOneForRead(id: string, user?: User): Promise<EnrichedPROT>` with read access enforcement while preserving existing internal `findOne(id)` behavior.

- [ ] **Step 1: Add failing service tests for guest/public detail reads**

In `../nusantara-play-backend/src/modules/prot/prot.service.spec.ts`, add tests near existing `findAll` tests:

```ts
it('allows guest users to read ARSIP_NASIONAL PROT detail', async () => {
  const prot = {
    id: 'published-id',
    nama: 'Gasing',
    status: PROTStatus.ARSIP_NASIONAL,
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  const result = await service.findOneForRead('published-id');

  expect(result.id).toBe('published-id');
});

it('hides draft PROT detail from guest users', async () => {
  const prot = {
    id: 'draft-id',
    nama: 'Gasing',
    status: PROTStatus.DRAFT,
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  await expect(service.findOneForRead('draft-id')).rejects.toThrow(NotFoundException);
});

it('allows kurator to read own draft PROT detail', async () => {
  const user = {
    id: 'user-1',
    role: UserRole.KURATOR_DAERAH,
  } as any;
  const prot = {
    id: 'own-draft-id',
    nama: 'Gasing',
    status: PROTStatus.DRAFT,
    created_by: user.id,
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  const result = await service.findOneForRead('own-draft-id', user);

  expect(result.id).toBe('own-draft-id');
});

it('forbids kurator from reading another user draft PROT detail', async () => {
  const user = {
    id: 'user-1',
    role: UserRole.KURATOR_DAERAH,
  } as any;
  const prot = {
    id: 'other-draft-id',
    nama: 'Gasing',
    status: PROTStatus.DRAFT,
    created_by: 'other-user-id',
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  await expect(service.findOneForRead('other-draft-id', user)).rejects.toThrow(ForbiddenException);
});
```

- [ ] **Step 2: Run test and confirm failure**

Run from `nusantara-play-backend/`:

```bash
npm test -- --testPathPattern=prot.service
```

Expected: FAIL because `findOneForRead` does not exist yet.

- [ ] **Step 3: Update controller to pass optional current user**

Change `findOne` in `../nusantara-play-backend/src/modules/prot/prot.controller.ts`:

```ts
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.protService.findOneForRead(id, user);
  }
```

- [ ] **Step 4: Implement role-aware detail visibility**

In `../nusantara-play-backend/src/modules/prot/prot.service.ts`, keep existing `findOne(id)` unchanged and add a private helper plus a new public read method:

```ts
  private canReadProtDetail(prot: PROT, user?: User): boolean {
    if (!user || user.role === UserRole.PUBLIK) {
      return prot.status === PROTStatus.ARSIP_NASIONAL;
    }

    if (user.role === UserRole.KURATOR_DAERAH) {
      return prot.created_by === user.id || prot.status === PROTStatus.ARSIP_NASIONAL;
    }

    if (user.role === UserRole.PAKAR) {
      return [
        PROTStatus.DIKURASI,
        PROTStatus.DIVERIFIKASI,
        PROTStatus.ARSIP_NASIONAL,
      ].includes(prot.status);
    }

    return user.role === UserRole.ADMIN_KPOTI;
  }

  async findOneForRead(id: string, user?: User): Promise<PROT & {
    provinsiName: string | null;
    kabkotaName: string | null;
    kecamatanName: string | null;
    desaName: string | null;
  }> {
    const prot = await this.protRepository.findOne({ where: { id } });
    if (!prot) {
      throw new NotFoundException(`PROT with ID ${id} not found`);
    }

    if (!this.canReadProtDetail(prot, user)) {
      if (!user || user.role === UserRole.PUBLIK) {
        throw new NotFoundException(`PROT with ID ${id} not found`);
      }
      throw new ForbiddenException('Anda tidak memiliki akses untuk melihat PROT ini');
    }

    return this.enrichWithDaerahNames(prot);
  }
```

- [ ] **Step 5: Run backend tests**

Run from `nusantara-play-backend/`:

```bash
npm test -- --testPathPattern=prot.service
```

Expected: PASS.

- [ ] **Step 6: Commit backend hardening**

Run from `nusantara-play-backend/`:

```bash
git add src/modules/prot/prot.controller.ts src/modules/prot/prot.service.ts src/modules/prot/prot.service.spec.ts
git commit -m "fix(prot): enforce public detail visibility"
```

