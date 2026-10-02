import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import type { Journal, JournalDraft } from '../../../../domain/journals/journal.model';
import type { JournalTemplate } from '../../../../domain/journals/journal-template.model';
import type { Organization } from '../../../../domain/organizations/organization.model';
import { SYSTEM_TEMPLATES } from '../../../../domain/templates/system-templates';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { JournalsStore } from '../../../../stores/journals.store';
import { SessionStore } from '../../../../stores/session.store';
import { JournalCreatePage } from '../journal-create.page';

describe('JournalCreatePage', () => {
  const template = SYSTEM_TEMPLATES[0] as JournalTemplate;

  const organization: Organization = {
    id: 'org-1',
    name: 'ООО Ромашка',
    responsiblePerson: 'Иванова Мария Петровна',
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'pending',
  };

  const journal: Journal = {
    id: 'j-9',
    orgId: 'org-1',
    templateId: template.id,
    title: template.name,
    startedAt: '2026-10-02',
    responsiblePerson: organization.responsiblePerson,
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'pending',
  };

  function setup() {
    const store = {
      templates: signal([template]),
      validate: vi.fn(() => ({})),
      create: vi.fn().mockResolvedValue(journal),
      load: vi.fn().mockResolvedValue(undefined),
    };
    const toast = {
      success: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined),
      show: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [JournalCreatePage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: JournalsStore, useValue: store },
        { provide: SessionStore, useValue: { organization: signal(organization) } },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(JournalCreatePage);
    fixture.detectChanges();
    return { fixture, store, toast };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('рендерит форму и подставляет ответственного из организации', () => {
    const { fixture } = setup();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Новый журнал');
    expect(text).toContain('Тип журнала');
    expect(text).toContain(template.name);
    expect(fixture.componentInstance['responsiblePerson']()).toBe(organization.responsiblePerson);
  });

  it('выбор шаблона подставляет его название', () => {
    const { fixture } = setup();

    fixture.componentInstance['selectTemplate'](template);
    fixture.detectChanges();

    expect(fixture.componentInstance['selectedTemplateId']()).toBe(template.id);
    expect(fixture.componentInstance['title']()).toBe(template.name);
    expect(fixture.nativeElement.querySelector('button[aria-pressed="true"]')).not.toBeNull();
  });

  it('создаёт журнал и открывает его', async () => {
    const { fixture, store, toast } = setup();
    fixture.componentInstance['selectTemplate'](template);

    await fixture.componentInstance['create']();

    const draft: JournalDraft = {
      templateId: template.id,
      title: template.name,
      responsiblePerson: organization.responsiblePerson,
      startedAt: fixture.componentInstance['startedAt'](),
    };
    expect(store.create).toHaveBeenCalledWith(draft);
    expect(toast.success).toHaveBeenCalledWith('Журнал создан');
  });

  it('показывает ошибки валидации и не создаёт журнал', async () => {
    const { fixture, store } = setup();
    store.validate.mockReturnValue({ title: 'Укажите название' });

    await fixture.componentInstance['create']();

    expect(fixture.componentInstance['errors']()).toEqual({ title: 'Укажите название' });
    expect(store.create).not.toHaveBeenCalled();
  });

  it('ошибка создания показывается тостом, saving сбрасывается', async () => {
    const { fixture, store, toast } = setup();
    fixture.componentInstance['selectTemplate'](template);
    store.create.mockRejectedValue(new Error('boom'));

    await fixture.componentInstance['create']();

    expect(toast.error).toHaveBeenCalledWith('boom');
    expect(fixture.componentInstance['saving']()).toBe(false);
  });
});
