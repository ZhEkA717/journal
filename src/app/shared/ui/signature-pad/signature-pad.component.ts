import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import SignaturePadLib from 'signature_pad';

/**
 * Поле подписи пальцем: рисуем по canvas, наружу отдаём PNG в base64 (ТЗ 8.5).
 * Значение хранится в `JournalEntry.data.signature` и вставляется в PDF (ТЗ 9.3).
 */
@Component({
  selector: 'app-signature-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon],
  template: `
    <div class="flex flex-col gap-2">
      <div
        class="relative overflow-hidden rounded-input border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <canvas
          #canvas
          class="block h-40 w-full touch-none"
          [class.opacity-50]="disabled()"
          [attr.aria-label]="ariaLabel()"
        ></canvas>
        @if (isEmpty()) {
          <p
            class="pointer-events-none absolute inset-0 flex items-center justify-center text-small text-[var(--color-text-muted)]"
          >
            Подпишите здесь
          </p>
        }
      </div>
      <div class="flex justify-end">
        <ion-button
          size="small"
          fill="clear"
          color="medium"
          [disabled]="disabled() || isEmpty()"
          (click)="clear()"
        >
          <ion-icon slot="start" [name]="clearIcon" aria-hidden="true" />
          Очистить
        </ion-button>
      </div>
    </div>
  `,
})
export class SignaturePadComponent {
  /** Готовая подпись в base64 PNG: подставляется при редактировании записи. */
  readonly signature = input<string>();
  /** Заблокировать рисование (например, на время сохранения). */
  readonly disabled = input(false);
  /** Текст для программного чтения. */
  readonly ariaLabel = input('Поле для подписи');
  /** Подпись изменилась: наружу отдаётся PNG в base64 либо пустая строка. */
  readonly signatureChange = output<string>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly ready = signal(false);
  private pad: SignaturePadLib | null = null;
  private appliedSignature = '';

  /** Подпись ещё не нарисована. */
  readonly isEmpty = signal(true);

  protected readonly clearIcon = 'close-outline';

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.pad = new SignaturePadLib(canvas, {
        penColor: 'rgb(15, 23, 42)',
        backgroundColor: 'rgba(255, 255, 255, 0)',
        minWidth: 0.7,
        maxWidth: 2.5,
      });
      this.pad.addEventListener('endStroke', this.onStrokeEnd);
      this.resizeCanvas();
      window.addEventListener('resize', this.resizeCanvas);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', this.resizeCanvas);
        this.pad?.off();
      });
      this.ready.set(true);
    });

    effect(() => {
      const signature = this.signature();
      if (this.ready()) {
        void this.applySignature(signature);
      }
    });

    effect(() => {
      const disabled = this.disabled();
      if (!this.ready()) {
        return;
      }
      if (disabled) {
        this.pad?.off();
      } else {
        this.pad?.on();
      }
    });
  }

  /** Очищает поле подписи. */
  clear(): void {
    this.pad?.clear();
    this.appliedSignature = '';
    this.isEmpty.set(true);
    this.signatureChange.emit('');
  }

  private readonly onStrokeEnd = (): void => {
    const dataUrl = this.pad && !this.pad.isEmpty() ? this.pad.toDataURL('image/png') : '';
    this.appliedSignature = dataUrl;
    this.isEmpty.set(dataUrl.length === 0);
    this.signatureChange.emit(dataUrl);
  };

  private async applySignature(signature: string | undefined): Promise<void> {
    const value = signature?.trim() ?? '';
    if (value === this.appliedSignature) {
      return;
    }
    this.appliedSignature = value;
    if (!this.pad) {
      return;
    }
    if (value.length === 0) {
      this.pad.clear();
      this.isEmpty.set(true);
      return;
    }
    await this.pad.fromDataURL(value);
    this.isEmpty.set(false);
  }

  private readonly resizeCanvas = (): void => {
    const canvas = this.canvasRef().nativeElement;
    if (!this.pad) {
      return;
    }
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const data = this.pad.isEmpty() ? undefined : this.pad.toData();
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.pad.clear();
    if (data) {
      this.pad.fromData(data);
    }
  };
}
